from fastapi import APIRouter

from app.api.v1.endpoints import admin, auth, chat, exclusions, payers, products, service_areas, stripe, suppliers, webhooks

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(suppliers.router)
api_router.include_router(products.router)
api_router.include_router(payers.router)
api_router.include_router(exclusions.router)
api_router.include_router(service_areas.router)
api_router.include_router(stripe.router)
api_router.include_router(chat.router)
api_router.include_router(admin.router)
api_router.include_router(webhooks.router)
