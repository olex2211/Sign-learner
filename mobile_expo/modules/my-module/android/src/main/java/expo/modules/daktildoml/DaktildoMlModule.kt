package expo.modules.daktildoml

import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import android.content.Context
import android.graphics.BitmapFactory
import android.net.Uri
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarker
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import kotlin.math.exp
import kotlin.math.sqrt

private class LocalMlUnavailableException(message: String, cause: Throwable? = null) :
  CodedException("ERR_LOCAL_ML_UNAVAILABLE", message, cause)

private class NoHandDetectedException :
  CodedException("ERR_NO_HAND_DETECTED", "No hand detected", null)

private class InvalidImageException(message: String) :
  CodedException("ERR_INVALID_IMAGE", message, null)

class DaktildoMlModule : Module() {
  private val env: OrtEnvironment by lazy { OrtEnvironment.getEnvironment() }
  private var session: OrtSession? = null
  private var inputName: String? = null
  private var labelsByIndex: Map<Int, String>? = null
  private var handLandmarker: HandLandmarker? = null

  override fun definition() = ModuleDefinition {
    Name("DaktildoMl")

    Function("isAvailable") {
      true
    }

    AsyncFunction("predictFromImageUri") { imageUri: String ->
      predictFromImageUri(imageUri)
    }
  }

  private fun predictFromImageUri(imageUri: String): Map<String, Any> {
    val context = appContext.reactContext
      ?: throw LocalMlUnavailableException("React context is unavailable")

    ensureInitialized(context)

    val bitmap = decodeBitmap(context, imageUri)
    val mpImage = BitmapImageBuilder(bitmap).build()
    val result = handLandmarker
      ?: throw LocalMlUnavailableException("Hand landmarker is not initialized")

    val landmarks = result.detect(mpImage).landmarks().firstOrNull()
      ?: throw NoHandDetectedException()

    val features = normalizeLandmarks(landmarks)
      ?: throw NoHandDetectedException()

    val ortSession = session ?: throw LocalMlUnavailableException("ONNX session is not initialized")
    val ortInputName = inputName ?: throw LocalMlUnavailableException("ONNX input name is missing")
    val labels = labelsByIndex ?: throw LocalMlUnavailableException("Label map is not loaded")

    val input = arrayOf(features)
    OnnxTensor.createTensor(env, input).use { tensor ->
      ortSession.run(mapOf(ortInputName to tensor)).use { output ->
        val logits = readLogits(output[0].value)
        val probabilities = softmax(logits)
        val index = probabilities.indices.maxBy { probabilities[it] }
        val gesture = labels[index]
          ?: throw LocalMlUnavailableException("Unknown label index: $index")

        return mapOf(
          "gesture" to gesture,
          "confidence" to (kotlin.math.round(probabilities[index] * 10000.0) / 10000.0),
          "label_index" to index
        )
      }
    }
  }

  @Synchronized
  private fun ensureInitialized(context: Context) {
    if (session != null && handLandmarker != null && labelsByIndex != null) {
      return
    }

    try {
      val onnxFile = copyAssetToFiles(context, "ml/gesture_classifier.onnx")
      copyAssetToFiles(context, "ml/gesture_classifier.onnx.data")

      val options = OrtSession.SessionOptions()
      session = env.createSession(onnxFile.absolutePath, options)
      inputName = session?.inputNames?.firstOrNull()

      labelsByIndex = loadLabels(context)

      val baseOptions = BaseOptions.builder()
        .setModelAssetPath("ml/hand_landmarker.task")
        .build()
      val landmarkerOptions = HandLandmarker.HandLandmarkerOptions.builder()
        .setBaseOptions(baseOptions)
        .setRunningMode(RunningMode.IMAGE)
        .setNumHands(1)
        .setMinHandDetectionConfidence(0.5f)
        .setMinHandPresenceConfidence(0.5f)
        .build()
      handLandmarker = HandLandmarker.createFromOptions(context, landmarkerOptions)
    } catch (error: Throwable) {
      throw LocalMlUnavailableException("Failed to initialize local ML", error)
    }
  }

  private fun decodeBitmap(context: Context, imageUri: String): android.graphics.Bitmap {
    val uri = Uri.parse(imageUri)
    val stream = if (uri.scheme.isNullOrBlank()) {
      File(imageUri).inputStream()
    } else {
      context.contentResolver.openInputStream(uri)
        ?: throw InvalidImageException("Cannot open image URI")
    }

    stream.use {
      return BitmapFactory.decodeStream(it)
        ?: throw InvalidImageException("Cannot decode image")
    }
  }

  private fun normalizeLandmarks(
    landmarks: List<com.google.mediapipe.tasks.components.containers.NormalizedLandmark>
  ): FloatArray? {
    if (landmarks.size < 21) {
      return null
    }

    val wristX = landmarks[0].x()
    val wristY = landmarks[0].y()
    val wristZ = landmarks[0].z()

    val centered = Array(21) { FloatArray(3) }
    for (i in 0 until 21) {
      centered[i][0] = landmarks[i].x() - wristX
      centered[i][1] = landmarks[i].y() - wristY
      centered[i][2] = landmarks[i].z() - wristZ
    }

    val scale = sqrt(
      (centered[9][0] * centered[9][0] +
        centered[9][1] * centered[9][1] +
        centered[9][2] * centered[9][2]).toDouble()
    ).toFloat()

    if (scale < 1e-6f) {
      return null
    }

    val features = FloatArray(63)
    var outputIndex = 0
    for (point in centered) {
      features[outputIndex++] = point[0] / scale
      features[outputIndex++] = point[1] / scale
      features[outputIndex++] = point[2] / scale
    }

    return features
  }

  private fun readLogits(value: Any): FloatArray {
    return when (value) {
      is Array<*> -> {
        val first = value.firstOrNull()
        when (first) {
          is FloatArray -> first
          is DoubleArray -> FloatArray(first.size) { first[it].toFloat() }
          else -> throw LocalMlUnavailableException("Unexpected ONNX output type")
        }
      }
      is FloatArray -> value
      is DoubleArray -> FloatArray(value.size) { value[it].toFloat() }
      else -> throw LocalMlUnavailableException("Unexpected ONNX output type")
    }
  }

  private fun softmax(logits: FloatArray): DoubleArray {
    val max = logits.maxOrNull() ?: 0f
    val exps = DoubleArray(logits.size) { exp((logits[it] - max).toDouble()) }
    val sum = exps.sum()
    return DoubleArray(logits.size) { exps[it] / sum }
  }

  private fun loadLabels(context: Context): Map<Int, String> {
    val jsonText = context.assets.open("ml/label_map.json")
      .bufferedReader()
      .use { it.readText() }
    val json = JSONObject(jsonText)
    val labels = mutableMapOf<Int, String>()

    for (key in json.keys()) {
      labels[json.getInt(key)] = key
    }

    return labels
  }

  private fun copyAssetToFiles(context: Context, assetPath: String): File {
    val outFile = File(context.filesDir, assetPath)
    outFile.parentFile?.mkdirs()

    val assetLength = context.assets.open(assetPath).use { it.available().toLong() }
    if (outFile.exists() && outFile.length() == assetLength) {
      return outFile
    }

    context.assets.open(assetPath).use { input ->
      FileOutputStream(outFile).use { output ->
        input.copyTo(output)
      }
    }

    return outFile
  }
}
