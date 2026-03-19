from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class SimulationInput(BaseModel):
    city: str
    interventions: dict


class InterventionResult(BaseModel):
    temperature_delta: float
    cost_estimate: int
    timeline_months: int
    details: Optional[dict] = None


@router.post("/simulate")
def run_simulation(input: SimulationInput):
    interventions = input.interventions
    
    trees = interventions.get("trees", 0)
    cool_roofs = interventions.get("cool_roofs", 0)
    green_corridors = interventions.get("green_corridors", 0)
    water_features = interventions.get("water_features", 0)
    
    temp_delta = -(
        trees * 0.03 +
        cool_roofs * 0.15 +
        green_corridors * 0.08 +
        water_features * 0.05
    )
    
    cost = (
        trees * 500 +
        cool_roofs * 2000 +
        green_corridors * 3000 +
        water_features * 8000
    )
    
    timeline = max(3, (trees + cool_roofs * 10 + green_corridors * 15 + water_features * 5) // 20)
    
    return InterventionResult(
        temperature_delta=round(temp_delta, 2),
        cost_estimate=cost,
        timeline_months=timeline,
        details={
            "tree_cooling": round(-trees * 0.03, 2),
            "cool_roof_cooling": round(-cool_roofs * 0.15, 2),
            "green_corridor_cooling": round(-green_corridors * 0.08, 2),
            "water_feature_cooling": round(-water_features * 0.05, 2),
        }
    )


@router.get("/simulate/presets")
def get_presets():
    return {
        "presets": [
            {
                "id": "basic_greening",
                "name": "Basic Urban Greening",
                "description": "500 trees + 20% cool roofs",
                "interventions": {"trees": 500, "cool_roofs": 20, "green_corridors": 0, "water_features": 0}
            },
            {
                "id": "comprehensive",
                "name": "Comprehensive Cool City",
                "description": "1000 trees + 50% cool roofs + green corridors + water features",
                "interventions": {"trees": 1000, "cool_roofs": 50, "green_corridors": 30, "water_features": 20}
            },
            {
                "id": "rapid_cooling",
                "name": "Rapid Cooling",
                "description": "Focus on cool roofs and water features for quick impact",
                "interventions": {"trees": 200, "cool_roofs": 80, "green_corridors": 10, "water_features": 30}
            },
        ]
    }

