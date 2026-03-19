from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers import zones, health, simulate, satellite, infrastructure

load_dotenv()

app = FastAPI(
    title="UrbanChill AI",
    description="Geo-intelligent urban heat resilience platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(health.router, tags=["Health"])
app.include_router(zones.router, prefix="/api", tags=["Zones"])
app.include_router(simulate.router, prefix="/api", tags=["Simulation"])
app.include_router(satellite.router, prefix="/api", tags=["Satellite"])
app.include_router(infrastructure.router, prefix="/api", tags=["Infrastructure"])

@app.get("/")
def root():
    return {"message": "UrbanChill AI is running", "version": "1.0.0"}
