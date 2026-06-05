from fastapi import APIRouter

router = APIRouter()


@router.post("/sessions")
async def create_session():
    return {"data": None, "error": "Non implémenté"}
