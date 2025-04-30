"use client"

export async function analyzeMriScan(imageData: string) {
  const formData = new FormData();
  
  // Convert base64 to a Blob (needed because FastAPI expects a file upload)
  const blob = await (await fetch(imageData)).blob();
  formData.append('file', blob, 'upload.png');

  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/predict/`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to analyze image");
  }

  const data = await response.json();

  // Transform backend response to what frontend expects
  return {
    model1: {
      modelName: "CNN-ResNet50",
      prediction: data.predictions[0].prediction,
      confidence: data.predictions[0].confidence,
      description: data.predictions[0].prediction === "Tumor"
        ? "Detected a tumor presence. Please seek professional medical diagnosis."
        : "No tumor detected in the scan. However, clinical evaluation is always advised.",
    },
    model2: {
      modelName: "VGG-16",
      prediction: data.predictions[1].prediction,
      confidence: data.predictions[1].confidence,
      description: data.predictions[1].prediction === "Tumor"
        ? "MRI shows patterns suggesting tumor presence. Further analysis recommended."
        : "No abnormalities found. Scan appears normal.",
    },
    model3: {
      modelName: "Sequential-CNN",
      prediction: data.predictions[2].prediction,
      confidence: data.predictions[2].confidence,
      description: data.predictions[2].prediction === "Tumor"
        ? "Signs of a tumor were identified by the model. Further diagnostic imaging is suggested."
        : "No tumor signs detected. MRI scan looks healthy.",
    },
  }
}
