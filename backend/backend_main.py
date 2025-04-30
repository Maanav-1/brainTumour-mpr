from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import tensorflow as tf
import numpy as np
from io import BytesIO
from PIL import Image
import google.generativeai as genai

# Initialize FastAPI app
app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Set your Google AI API Key
GOOGLE_API_KEY = "AIzaSyAizjb5_Sz09rB6pJaK0jfc5P9ZFDCLIyI"
genai.configure(api_key=GOOGLE_API_KEY)

# Load Gemini model
gemini_model = genai.GenerativeModel('gemini-1.5-pro-latest')

# Load TensorFlow models
model1 = tf.keras.models.load_model("models/cnn_resnet50.h5")  # 128x128
model2 = tf.keras.models.load_model("models/vgg16.h5")         # 224x224
model3 = tf.keras.models.load_model("models/sequential_cnn.h5")# 150x150

print("Model1 (ResNet50) Input Shape:", model1.input_shape)
print("Model2 (VGG16) Input Shape:", model2.input_shape)
print("Model3 (Sequential CNN) Input Shape:", model3.input_shape)

# Class labels
resnet50_labels = ['pituitary', 'glioma', 'notumor', 'meningioma']
other_labels = ['glioma', 'meningioma', 'notumor', 'pituitary']

def read_image(file: bytes, target_size: tuple) -> np.ndarray:
    """Read and preprocess image."""
    image = Image.open(BytesIO(file)).convert('RGB')
    image = image.resize(target_size)
    img_array = np.array(image) / 255.0
    img_array = np.expand_dims(img_array, axis=0)
    return img_array

async def get_google_ai_analysis(image_bytes: bytes, vgg16_prediction: str) -> str:
    """Call Google Gemini API for analysis using the VGG16 model prediction."""
    prompt = (
        "You are a professional medical AI specialized in brain tumor analysis.\n"
        "The following prediction was made by a VGG16 deep learning model analyzing an MRI scan.\n\n"
        "VGG16 Model Prediction: {vgg16_prediction}\n\n"
        # "Based on this prediction, provide a short, professional medical analysis:\n"
        "-analyze the image and give summary of the findings"
        "give some description of the ct scan"
        "-describe the tumour location,size(cm), density, intensity(like dangerous), margins,edema in the brain from the image(in detail)"
        "- Briefly describe what this tumor type is.\n"
        "- Mention common characteristics of this tumor type.\n"
        "- Keep the explanation detailed\n\n"
        "Do NOT mention model names, confidence scores, or any uncertainty.\n"
        "dont give any bold text"
        # "Focus only on explaining the tumor class to a patient."
    )

    response = gemini_model.generate_content(
        contents=[
            {"role": "user", "parts": [
                {"text": prompt.format(vgg16_prediction=vgg16_prediction)},
                {"inline_data": {"mime_type": "image/jpeg", "data": image_bytes}}
            ]}
        ],
        generation_config={
            "temperature": 0.3,
            "max_output_tokens": 500
        }
    )

    return response.text if hasattr(response, "text") else "AI analysis not available at the moment."

@app.post("/predict/")
async def predict(file: UploadFile = File(...)):
    """Predict tumor type and get Google AI analysis."""
    content = await file.read()

    preds = []

    # Model 1 (CNN-ResNet50)
    img_array1 = read_image(content, (128, 128))
    prediction1 = model1.predict(img_array1, verbose=0)[0]
    label1 = resnet50_labels[np.argmax(prediction1)]
    confidence1 = np.max(prediction1)
    preds.append({
        "model": "CNN-ResNet50",
        "prediction": label1,
        "confidence": round(confidence1 * 100, 2)
    })

    # Model 2 (VGG16)
    img_array2 = read_image(content, (224, 224))
    prediction2 = model2.predict(img_array2, verbose=0)[0]
    label2 = other_labels[np.argmax(prediction2)]
    confidence2 = np.max(prediction2)
    preds.append({
        "model": "VGG16",
        "prediction": label2,
        "confidence": round(confidence2 * 100, 2)
    })

    # Model 3 (Sequential CNN)
    img_array3 = read_image(content, (150, 150))
    prediction3 = model3.predict(img_array3, verbose=0)[0]
    label3 = other_labels[np.argmax(prediction3)]
    confidence3 = np.max(prediction3)
    preds.append({
        "model": "Sequential-CNN",
        "prediction": label3,
        "confidence": round(confidence3 * 100, 2)
    })

    # 🔥 Call Google Gemini to analyze the image based on VGG16 model prediction
    analysis = await get_google_ai_analysis(content, label2)

    return {
        "predictions": preds,
        "analysis": analysis
    }
