const maxImageSizeMb = 4;
const maxImageSizeBytes = maxImageSizeMb * 1024 * 1024;
const supportedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

const form = document.querySelector('#analyzerForm');
const fileInput = document.querySelector('#faceImage');
const uploadButton = document.querySelector('#uploadButton');
const uploadButtonText = document.querySelector('#uploadButtonText');
const removeImageButton = document.querySelector('#removeImageButton');
const resetButton = document.querySelector('#resetButton');
const dropzone = document.querySelector('#dropzone');
const previewFrame = document.querySelector('#previewFrame');
const imagePreview = document.querySelector('#imagePreview');
const fileName = document.querySelector('#fileName');
const analyzeButton = document.querySelector('#analyzeButton');
const resultTitle = document.querySelector('#resultTitle');
const resultIcon = document.querySelector('#resultIcon');
const emptyResult = document.querySelector('#emptyResult');
const loadingState = document.querySelector('#loadingState');
const errorMessage = document.querySelector('#errorMessage');
const feedbackCard = document.querySelector('#feedbackCard');

let selectedImage = null;
let isAnalyzing = false;

function setVisibility(el, show) {
  el?.classList.toggle('is-hidden', !show);
}

function setError(msg) {
  resultTitle.textContent = 'Error';
  resultIcon.textContent = '!';
  errorMessage.textContent = msg;
  setVisibility(errorMessage, true);
  setVisibility(feedbackCard, false);
  setVisibility(emptyResult, false);
}

function clearImage() {
  selectedImage = null;
  fileInput.value = '';
  imagePreview.removeAttribute('src');
  fileName.textContent = '';
  analyzeButton.disabled = true;
  setVisibility(dropzone, true);
  setVisibility(previewFrame, false);
}

function resetResult() {
  feedbackCard.textContent = '';
  setVisibility(feedbackCard, false);
  setVisibility(errorMessage, false);
  setVisibility(loadingState, false);
  resultTitle.textContent = 'Your Look Is On Deck';
  resultIcon.textContent = '';
  setVisibility(emptyResult, true);
}

function setSelectedImage(file) {
  selectedImage = file;
  imagePreview.src = URL.createObjectURL(file);
  fileName.textContent = file.name;
  analyzeButton.disabled = false;

  setVisibility(dropzone, false);
  setVisibility(previewFrame, true);
}

function handleFile(file) {
  if (!file) return;

  if (!supportedImageTypes.includes(file.type)) {
    return setError('Invalid image type.');
  }

  if (file.size > maxImageSizeBytes) {
    return setError('Image too large.');
  }

  setSelectedImage(file);
}

async function runAnalysis(e) {
  e.preventDefault();
  if (!selectedImage || isAnalyzing) return;

  isAnalyzing = true;
  analyzeButton.disabled = true;

  setVisibility(loadingState, true);

  const formData = new FormData();
  formData.append('faceImage', selectedImage);

  try {
    const res = await fetch('http://localhost:3000/analyze', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    if (!data.success) throw new Error(data.error);

    feedbackCard.textContent = data.result;

    setVisibility(feedbackCard, true);
    setVisibility(emptyResult, false);
    setVisibility(errorMessage, false);
  } catch (err) {
    setError(err.message);
  } finally {
    isAnalyzing = false;
    analyzeButton.disabled = false;
    setVisibility(loadingState, false);
  }
}

fileInput.addEventListener('change', e => handleFile(e.target.files[0]));
uploadButton.addEventListener('click', () => fileInput.click());
removeImageButton.addEventListener('click', clearImage);
resetButton.addEventListener('click', () => {
  clearImage();
  resetResult();
});
form.addEventListener('submit', runAnalysis);