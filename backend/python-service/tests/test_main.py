from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "python-ml-speech-service"
    assert "timestamp" in data


def test_transcribe_speech_validation_error():
    response = client.post("/api/speech/transcribe", json={})
    assert response.status_code == 400
    assert "Either audio_url or audio_base64 must be provided" in response.json()["detail"]


def test_transcribe_speech_success():
    response = client.post(
        "/api/speech/transcribe",
        json={"audio_url": "https://example.com/test-audio.mp3"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "transcript" in data
    assert data["confidence"] > 0
