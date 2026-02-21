from fastapi import FastAPI
import uvicorn
from src.api.router import api_router

app = FastAPI(
    title="Sign Language API",
    description="Sign learner API",
    version="1.0.0"
)

app.include_router(api_router, prefix="/api")

@app.get("/")
async def read_root():
    return {"Hello": "World"}

if __name__ == "__main__":
    uvicorn.run(app)
