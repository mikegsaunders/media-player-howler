// CUE Parser Class
class CueParser {
  constructor(cueContent) {
    this.content = cueContent;
    this.tracks = [];
    this.metadata = {
      title: "",
      performer: "",
      filename: "",
    };
  }

  parse() {
    const lines = this.content.split("\n");
    let currentTrack = null;

    lines.forEach((line) => {
      line = line.trim();

      if (line.startsWith("TITLE ")) {
        const title = line.substring(6).replace(/"/g, "");
        if (currentTrack) {
          currentTrack.title = title;
        } else {
          this.metadata.title = title;
        }
      } else if (line.startsWith("PERFORMER ")) {
        const performer = line.substring(10).replace(/"/g, "");
        if (currentTrack) {
          currentTrack.performer = performer;
        } else {
          this.metadata.performer = performer;
        }
      } else if (line.startsWith("FILE ")) {
        this.metadata.filename = line.split('"')[1];
      } else if (line.startsWith("TRACK ")) {
        if (currentTrack) {
          this.tracks.push(currentTrack);
        }
        currentTrack = {
          number: parseInt(line.split(" ")[1]),
          title: "",
          performer: "",
          index: 0,
        };
      } else if (line.startsWith("INDEX 01")) {
        if (currentTrack) {
          const [mins, secs, frames] = line.split(" ")[2].split(":");
          currentTrack.index =
            parseInt(mins) * 60 + parseInt(secs) + parseInt(frames) / 75;
        }
      }
    });

    if (currentTrack) {
      this.tracks.push(currentTrack);
    }

    // Calculate track durations
    for (let i = 0; i < this.tracks.length; i++) {
      const nextIndex =
        i < this.tracks.length - 1 ? this.tracks[i + 1].index : null;
      this.tracks[i].duration = nextIndex
        ? nextIndex - this.tracks[i].index
        : null;
    }

    return {
      metadata: this.metadata,
      tracks: this.tracks,
    };
  }
}
const tracks = []; // This will be used for non-CUE tracks

let currentTrackIndex = 0;
let sound = null;
let isPlaying = false;
let progressInterval = null;
let cueData = null;
let isCueFile = false;

function createMusicPlayer() {
  const container = document.createElement("div");
  container.id = "audio-player";

  // === Playlist Section ===
  const playlistDiv = document.createElement("div");
  playlistDiv.classList.add("playlist");

  const playlistTitle = document.createElement("h3");
  playlistTitle.textContent = "Playlist";

  playlistDiv.appendChild(playlistTitle);

  const tracksContainer = document.createElement("div");

  // Modify track creation to handle both CUE and regular tracks
  const createTrackElements = () => {
    const tracksToUse = isCueFile ? cueData.tracks : tracks;

    tracksToUse.forEach((track, index) => {
      const trackDiv = document.createElement("div");
      trackDiv.classList.add("track");
      trackDiv.dataset.index = index;
      trackDiv.tabIndex = 0;

      const icon = document.createElement("span");
      icon.classList.add("material-symbols-outlined");
      icon.textContent = "play_arrow";

      const trackInfo = document.createElement("div");
      trackInfo.classList.add("track-info");

      const trackTitle = document.createElement("p");
      trackTitle.textContent = track.title || `Track ${index + 1}`;

      const trackArtist = document.createElement("p");
      trackArtist.textContent =
        track.performer || track.artist || "Unknown Artist";
      trackArtist.style.color = "#aaa";

      trackInfo.appendChild(trackTitle);
      trackInfo.appendChild(trackArtist);

      const duration = document.createElement("span");
      duration.classList.add("track-duration");
      duration.textContent = track.duration
        ? formatTime(track.duration)
        : "Loading...";

      trackDiv.appendChild(icon);
      trackDiv.appendChild(trackInfo);
      trackDiv.appendChild(duration);

      trackDiv.addEventListener("click", () => playTrack(index));
      trackDiv.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          playTrack(index);
        }
      });

      tracksContainer.appendChild(trackDiv);
    });
  };

  playlistDiv.appendChild(tracksContainer);

  // === Album Section ===
  const albumDiv = document.createElement("div");
  albumDiv.classList.add("album");

  const albumDetails = document.createElement("div");
  albumDetails.classList.add("details");

  const albumImage = document.createElement("img");
  albumImage.src =
    (isCueFile ? cueData.metadata.cover : tracks[currentTrackIndex].cover) ||
    "https://placehold.co/200x200";
  albumImage.alt = "Album Art";

  // Make album image clickable if PDF exists
  if (isCueFile && cueData.metadata.pdf) {
    albumImage.style.cursor = "pointer";
    albumImage.addEventListener("click", () => {
      window.open(cueData.metadata.pdf, "_blank");
    });
  }

  const albumInfo = document.createElement("div");
  albumInfo.classList.add("info");

  const albumTitle = document.createElement("h2");
  albumTitle.textContent = isCueFile
    ? cueData.metadata.title
    : "A Nocturne Of Nightingales" || "Album Title";

  const albumArtist = document.createElement("p");
  albumArtist.textContent = isCueFile
    ? cueData.metadata.performer
    : "Jean C. Roché" || "Artist Name";

  const nowPlaying = document.createElement("p");
  nowPlaying.id = "now-playing";
  nowPlaying.style.fontSize = "14px";
  nowPlaying.style.color = "#aaa";
  nowPlaying.style.display = "none";

  const playButton = document.createElement("button");
  playButton.classList.add("play-button");
  playButton.id = "play-btn";

  const playIcon = document.createElement("span");
  playIcon.classList.add("material-symbols-outlined");
  playIcon.textContent = "play_arrow";

  playButton.appendChild(playIcon);
  playButton.append("Play");
  playButton.addEventListener("click", togglePlay);

  albumInfo.appendChild(albumTitle);
  albumInfo.appendChild(albumArtist);
  albumInfo.appendChild(playButton);

  albumDetails.appendChild(albumImage);
  albumDetails.appendChild(albumInfo);
  albumDiv.appendChild(albumDetails);
  albumDiv.appendChild(nowPlaying);

  // === Progress Bar ===
  const progressContainer = document.createElement("div");
  progressContainer.classList.add("progress-container");

  // Time Display
  const timeDisplay = document.createElement("div");
  timeDisplay.classList.add("time-display");
  timeDisplay.textContent = "0:00 / 0:00";

  const progressBar = document.createElement("input");
  progressBar.type = "range";
  progressBar.min = 0;
  progressBar.max = 100;
  progressBar.value = 0;
  progressBar.classList.add("progress-bar");
  progressBar.tabIndex = 0;

  progressBar.addEventListener("input", () => {
    if (sound) {
      sound.seek((progressBar.value / 100) * sound.duration());
    }
  });
  progressContainer.appendChild(timeDisplay);
  progressContainer.appendChild(progressBar);
  albumDiv.appendChild(progressContainer);

  // === Controls (Prev, Play, Next, Volume) ===
  const controlsDiv = document.createElement("div");
  controlsDiv.classList.add("controls");

  const prevButton = document.createElement("button");
  prevButton.innerHTML =
    "<span class='material-symbols-outlined'>skip_previous</span>";
  prevButton.addEventListener("click", playPrevious);

  const nextButton = document.createElement("button");
  nextButton.innerHTML =
    "<span class='material-symbols-outlined'>skip_next</span>";
  nextButton.addEventListener("click", playNext);

  // === Volume Control with Icon ===
  const volumeControl = document.createElement("div");
  volumeControl.classList.add("volume-control");

  const volumeIcon = document.createElement("span");
  volumeIcon.classList.add("material-symbols-outlined", "volume-icon");
  volumeIcon.textContent = "volume_up";

  const volumeSlider = document.createElement("input");
  volumeSlider.type = "range";
  volumeSlider.min = 0;
  volumeSlider.max = 1;
  volumeSlider.step = 0.01;
  volumeSlider.value = 1;
  volumeSlider.classList.add("volume-slider");
  volumeSlider.tabIndex = 0;

  volumeSlider.addEventListener("input", () => {
    if (sound) sound.volume(volumeSlider.value);
  });

  // Append icon & slider together
  volumeControl.appendChild(volumeIcon);
  volumeControl.appendChild(volumeSlider);

  controlsDiv.appendChild(prevButton);
  controlsDiv.appendChild(playButton);
  controlsDiv.appendChild(nextButton);
  controlsDiv.appendChild(volumeControl);
  albumDiv.appendChild(controlsDiv);

  container.appendChild(playlistDiv);
  container.appendChild(albumDiv);

  const audioPlayerContainer = document.getElementById(
    "audio-player-container"
  );
  audioPlayerContainer.appendChild(container);

  // Create track elements after appending to the DOM
  createTrackElements();

  // Embed PDF if it exists
  if (isCueFile && cueData.metadata.pdf) {
    const pdfContainer = document.createElement("div");
    pdfContainer.classList.add("pdf-container");

    const pdfIframe = document.createElement("iframe");
    pdfIframe.src =
      "https://docs.google.com/viewer?url=https://github.com/mikegsaunders/media-player-howler/raw/main/examples/S-SOC-CD-089_D1_CD-Booklet_eng.pdf&embedded=true";
    // pdfIframe.src = `https://docs.google.com/viewer?url=${cueData.metadata.pdf}&embedded=true`;
    pdfIframe.width = "100%";
    pdfIframe.height = "500px";

    pdfIframe.onerror = () => {
      pdfContainer.innerHTML =
        "<p>Failed to load PDF. No preview available.</p>";
    };

    pdfContainer.appendChild(pdfIframe);
    audioPlayerContainer.appendChild(pdfContainer);
  }
}

// === Play/Pause Functions using Howler.js ===
function playTrack(index) {
  if (sound) {
    sound.stop();
    clearInterval(progressInterval);
  }

  currentTrackIndex = index;

  if (isCueFile) {
    const track = cueData.tracks[index];
    sound = new Howl({
      src: [cueData.metadata.filename],
      html5: true,
      sprite: {
        track: [track.index * 1000, (track.duration || 300) * 1000],
      },
      onplay: () => {
        isPlaying = true;
        updateUI();
        startProgressUpdate();
      },
      onend: () => {
        isPlaying = false;
        updateUI();
        if (currentTrackIndex < cueData.tracks.length - 1) {
          playTrack(currentTrackIndex + 1);
        }
      },
    });
    sound.play("track");
  } else {
    sound = new Howl({
      src: [tracks[index].url],
      html5: true,
      onplay: () => {
        isPlaying = true;
        updateUI();
        startProgressUpdate();
      },
      onend: () => {
        isPlaying = false;
        updateUI();
      },
    });
    sound.play();
  }
}

function togglePlay() {
  if (!sound) {
    playTrack(currentTrackIndex);
  } else if (isPlaying) {
    sound.pause();
    isPlaying = false;
  } else {
    sound.play();
    isPlaying = true;
  }
  updateUI();
}

function playPrevious() {
  currentTrackIndex =
    (currentTrackIndex -
      1 +
      (isCueFile ? cueData.tracks.length : tracks.length)) %
    (isCueFile ? cueData.tracks.length : tracks.length);
  playTrack(currentTrackIndex);
}

function playNext() {
  currentTrackIndex =
    (currentTrackIndex + 1) %
    (isCueFile ? cueData.tracks.length : tracks.length);
  playTrack(currentTrackIndex);
}

// === Progress Bar Update ===
function startProgressUpdate() {
  if (progressInterval) {
    clearInterval(progressInterval);
  }

  progressInterval = setInterval(() => {
    if (sound && sound.playing()) {
      const currentTime = formatTime(sound.seek());
      const totalTime = formatTime(sound.duration());
      document.querySelector(
        ".time-display"
      ).textContent = `${currentTime} / ${totalTime}`;

      const progressBar = document.querySelector(".progress-bar");
      if (progressBar) {
        const progress = (sound.seek() / sound.duration()) * 100;
        progressBar.value = progress;
        progressBar.style.setProperty("--progress", `${progress}%`);
      }
    }
  }, 500);
}

// === Update UI ===
function updateUI() {
  const playButton = document.querySelector("#play-btn");
  const playIcon = playButton.querySelector("span");
  const nowPlayingText = document.querySelector("#now-playing");

  if (nowPlayingText) {
    if (isPlaying) {
      nowPlayingText.textContent = `Currently Playing: ${
        isCueFile
          ? cueData.tracks[currentTrackIndex].title
          : tracks[currentTrackIndex].title
      }`;
      nowPlayingText.style.display = "block";
    } else {
      nowPlayingText.style.display = "none";
    }
  }
  const allTracks = document.querySelectorAll(".track");
  allTracks.forEach((track) => track.classList.remove("playing-track"));

  const currentTrack = document.querySelector(
    `.track[data-index="${currentTrackIndex}"]`
  );
  if (currentTrack) {
    currentTrack.classList.add("playing-track");
  }

  if (playButton) {
    playIcon.textContent = isPlaying ? "pause" : "play_arrow";
    playButton.childNodes[1].nodeValue = isPlaying ? " Pause" : " Play"; // Updates text
  }
}

// === Load Track Durations ===
function loadTrackDuration(index, durationElement) {
  const tempSound = new Howl({
    src: [tracks[index].url],
    html5: true,
    preload: true,
    onload: function () {
      tracks[index].duration = tempSound.duration();
      durationElement.textContent = formatTime(tracks[index].duration);
      tempSound.unload();
    },
  });
}

// === Format Time ===
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

// Function to load CUE file
async function loadCueFile(cueFileUrl) {
  try {
    const response = await fetch(cueFileUrl);
    const cueContent = await response.text();
    const parser = new CueParser(cueContent);
    cueData = parser.parse();

    // Derive WAV file URL from CUE file URL
    const wavFileUrl = cueFileUrl.replace(/\.cue$/i, ".wav");

    cueData.metadata.filename = wavFileUrl;
    isCueFile = true;

    // Attempt to load cover image from the same folder
    const coverImageUrl = cueFileUrl.replace(/\.cue$/i, ".jpg");
    cueData.metadata.cover = coverImageUrl;

    // Attempt to load PDF from the same folder
    const pdfUrl = cueFileUrl.replace(/\.cue$/i, ".pdf");
    cueData.metadata.pdf = pdfUrl;

    // Recreate the player with CUE data
    document.getElementById("audio-player")?.remove();
    createMusicPlayer();
  } catch (error) {
    console.error("Failed to load CUE file:", error);
  }
}

// === Start Player on Page Load ===
// with mp3s:
// document.addEventListener("DOMContentLoaded", createMusicPlayer);
// with wav single file:
loadCueFile("http://127.0.0.1:5500/wav/S-SOC-CD-089.cue");

icons_css = `<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />`;
