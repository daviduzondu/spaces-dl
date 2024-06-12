const path = require("path");
const { whisper } = require(path.join(
  __dirname,
  "./build/addon.node"
));

console.log(whisper);
const { promisify } = require("util");

const whisperAsync = promisify(whisper);

const whisperParams = {
  language: "en",
  model: path.join(__dirname, "./models/ggml-base.en.bin"),
  fname_inp: path.join(__dirname, "./jfk.wav"),
  use_gpu: true,
  flash_attn: false,
  no_prints: true,
  comma_in_time: false,
  translate: true,
  no_timestamps: false,
  audio_ctx: 0,
};

// const arguments = process.argv.slice(2);

const params = Object.fromEntries(
  process.argv.slice(2).reduce((pre, item) => {
    if (item.startsWith("--")) {
      const [key, value] = item.slice(2).split("=");
      if (key === "audio_ctx") {
        whisperParams[key] = parseInt(value);
      } else {
        whisperParams[key] = value;
      }
      return pre;
    }
    return pre;
  }, [])
);

for (const key in params) {
  if (whisperParams.hasOwnProperty(key)) {
    whisperParams[key] = params[key];
  }
}

console.log("whisperParams =", whisperParams);

whisperAsync(whisperParams).then((result) => {
  console.log();
  console.log(result);
});
