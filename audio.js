const tracks = [
  {
    title: "In a Mountain Forest in Northern Greece, May",
    artist: "Jean C. Roché",
    url: "examples\\S-SOC-CD-089_D1_f01_v1.m4a",
  },
  {
    title: "Woodland Edge In Bourgogne, May",
    artist: "Jean C. Roché",
    url: "examples\\S-SOC-CD-089_D1_f02_v1.m4a",
  },
  {
    title: "In a Small Copse in An Alpine Valley, June",
    artist: "Jean C. Roché",
    url: "examples\\S-SOC-CD-089_D1_f03_v1.m4a",
  },
  {
    title: "A Wood On The Ile de France, June",
    artist: "Jean C. Roché",
    url: "examples\\S-SOC-CD-089_D1_f04_v1.m4a",
  },
  {
    title: "At The Edge Of A Small Lake, Bresse, June",
    artist: "Jean C. Roché",
    url: "examples\\S-SOC-CD-089_D1_f05_v1.m4a",
  },
];

// const tracks = [
//   { url: "For Mike CD-DA\\m4a ID3\\S-SOC-CD-089_D1_f01_v1.m4a" },
//   { url: "For Mike CD-DA\\m4a ID3\\S-SOC-CD-089_D1_f02_v1.m4a" },
//   { url: "For Mike CD-DA\\m4a ID3\\S-SOC-CD-089_D1_f03_v1.m4a" },
// ];

// function updatePlaylistDisplay(index) {
//   const trackElements = document.querySelectorAll(".track");
//   if (trackElements[index]) {
//     trackElements[index].querySelector("p").textContent = tracks[index].title;
//     trackElements[index].querySelector(
//       ".track-info p:nth-child(2)"
//     ).textContent = tracks[index].artist;
//   }
// }

// tracks.forEach((track, index) => {
//   async function extractMetadata(track, index) {
//     if (!window.musicMetadata) {
//       console.warn("music-metadata not loaded yet. Retrying...");
//       setTimeout(() => extractMetadata(track, index), 500);
//       return;
//     }
//     try {
//       const response = await fetch(track.url);
//       const arrayBuffer = await response.arrayBuffer();
//       const metadata = await window.musicMetadata.parseBuffer(arrayBuffer);

//       track.title = metadata.common.title || `Track ${index + 1}`;
//       track.artist = metadata.common.artist || "Unknown Artist";
//       track.album = metadata.common.album || "Unknown Album";

//       if (metadata.common.picture && metadata.common.picture.length > 0) {
//         const picture = metadata.common.picture[0];
//         const base64String = btoa(
//           new Uint8Array(picture.data).reduce(
//             (data, byte) => data + String.fromCharCode(byte),
//             ""
//           )
//         );
//         track.cover = `data:${picture.format};base64,${base64String}`;
//       } else {
//         track.cover = "default-album-art.jpg";
//       }

//       updatePlaylistDisplay(index);
//     } catch (error) {
//       console.warn(`Metadata read error for ${track.url}:`, error);
//     }
//   }

//   // Run metadata extraction for each track
//   tracks.forEach((track, index) => extractMetadata(track, index));
// });

let currentTrackIndex = 0;
let sound = null;
let isPlaying = false;
let progressInterval = null;

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

  tracks.forEach((track, index) => {
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
    trackTitle.textContent = track.title;

    const trackArtist = document.createElement("p");
    trackArtist.textContent = track.artist;
    trackArtist.style.color = "#aaa";

    trackInfo.appendChild(trackTitle);
    trackInfo.appendChild(trackArtist);

    const duration = document.createElement("span");
    duration.classList.add("track-duration");
    duration.textContent = "Loading..."; // Placeholder

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

    // Load track duration dynamically
    loadTrackDuration(index, duration);
  });

  playlistDiv.appendChild(tracksContainer);

  // === Album Section ===
  const albumDiv = document.createElement("div");
  albumDiv.classList.add("album");

  const albumDetails = document.createElement("div");
  albumDetails.classList.add("details");

  const albumImage = document.createElement("img");
  albumImage.src =
    tracks[currentTrackIndex].cover ||
    "examples\\S-SOC-CD-089_D1_eng_x1.jpg" ||
    "https://placehold.co/200x200";
  albumImage.alt = "Album Art";

  const albumInfo = document.createElement("div");
  albumInfo.classList.add("info");

  const albumTitle = document.createElement("h2");
  albumTitle.textContent = "A Nocturne Of Nightingales" || "Album Title";

  const albumArtist = document.createElement("p");
  albumArtist.textContent = "Jean C. Roché" || "Artist Name";

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
  document.body.appendChild(container);
}

// === Play/Pause Functions using Howler.js ===
function playTrack(index) {
  if (sound) {
    sound.stop();
    clearInterval(progressInterval);
  }

  currentTrackIndex = index;
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
  currentTrackIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
  playTrack(currentTrackIndex);
}

function playNext() {
  currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
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
      nowPlayingText.textContent = `Currently Playing: ${tracks[currentTrackIndex].title}`;
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

// === Start Player on Page Load ===
document.addEventListener("DOMContentLoaded", createMusicPlayer);
