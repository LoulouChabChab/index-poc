from fastapi import APIRouter

router = APIRouter()


@router.post("/sources")
async def upload_source():
    return {"data": None, "error": "Non implémenté"}
