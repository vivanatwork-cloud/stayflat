# Local screenshot reader assets

Served only when a user requests screenshot recognition. No financial images are sent to another service.

- worker.min.js: tesseract.js 7.0.0 (Apache-2.0)
- tesseract-core-*.wasm.js: tesseract.js-core 7.0.0, LSTM variants (Apache-2.0)
- eng.traineddata.gz: @tesseract.js-data/eng 1.0.0, 4.0.0_best_int (Apache-2.0), downloaded from https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int/eng.traineddata.gz

Copied from installed packages; keep worker and core versions aligned when upgrading. The embedded WASM files contain the runtime. Model files are public recognition assets, not user data.
