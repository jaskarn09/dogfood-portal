# ---- Stage 1: build the React frontend ----
FROM node:20-slim AS frontend-build
WORKDIR /frontend
COPY src/frontend/package*.json ./
RUN npm install
COPY src/frontend/ ./
RUN npm run build

# ---- Stage 2: Python backend + built frontend ----
FROM python:3.12-slim
WORKDIR /app

COPY src/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/backend/ .
COPY --from=frontend-build /frontend/dist ./static

EXPOSE 8080
CMD ["python", "app.py"]