from fastapi import APIRouter

router = APIRouter()


@router.post("/exports")
async def export_dataset():
    return {"data": None, "error": "Non implémenté"}
