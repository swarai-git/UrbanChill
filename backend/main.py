from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import satellite, lst, heatmap

app = FastAPI(
    title="UrbanChill AI API",
    description="Geo-intelligent decision support for urban heat resilience",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(satellite.router, prefix="/api/satellite", tags=["Satellite Data"])
app.include_router(lst.router,       prefix="/api/lst",       tags=["LST Calibration"])
app.include_router(heatmap.router,   prefix="/api/heatmap",   tags=["Heat Trap Detection"])

@app.get("/")
def root():
    return {"status": "UrbanChill AI backend running"}