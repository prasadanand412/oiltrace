FROM python:3.11-slim

WORKDIR /app

COPY oiltrace-backend/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

COPY oiltrace-backend/ .
COPY ml/detection ./ml/detection
COPY ml/attribution ./ml/attribution
COPY ml/drift_trace ./ml/drift_trace

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
