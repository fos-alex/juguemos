# Whisper (faster-whisper, through speaches) with its model already inside
# the image, so a fresh container needs no download and no network access
# before it can transcribe. Build context: this directory.
FROM ghcr.io/speaches-ai/speaches:0.8.3-cpu
RUN huggingface-cli download Systran/faster-whisper-small \
  config.json model.bin tokenizer.json vocabulary.txt README.md
