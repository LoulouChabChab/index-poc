#!/bin/bash
set -e

echo "=== Index — démarrage ==="

# Vérification Ollama
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
  echo ""
  echo "❌ Ollama n'est pas détecté sur localhost:11434."
  echo ""
  echo "Pour l'installer : https://ollama.com"
  echo "Puis télécharger le modèle : ollama pull mistral"
  echo ""
  exit 1
fi
echo "✓ Ollama détecté"

# Backend
cd backend
if [ ! -d ".venv" ]; then
  echo "→ Création de l'environnement Python..."
  python3 -m venv .venv
  .venv/bin/pip install -q -r requirements.txt
fi
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!
echo "✓ Backend démarré (PID $BACKEND_PID)"
cd ..

# Frontend
cd frontend
if [ ! -d "node_modules" ]; then
  echo "→ Installation des dépendances frontend..."
  npm install -q
fi
npm run dev &
FRONTEND_PID=$!
echo "✓ Frontend démarré (PID $FRONTEND_PID)"
cd ..

echo ""
echo "=== Index prêt ==="
echo "  Frontend : http://localhost:5173"
echo "  Backend  : http://localhost:8000"
echo ""
echo "Ctrl+C pour arrêter."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
