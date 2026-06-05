from fastapi import APIRouter

router = APIRouter()


@router.get("/mappings")
async def get_mappings():
    return {"data": None, "error": "Non implémenté"}
