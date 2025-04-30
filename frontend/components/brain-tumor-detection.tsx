"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Upload, Brain, AlertCircle, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type TumorType = "glioma" | "meningioma" | "notumor" | "pituitary";

type ModelPrediction = {
  modelName: string;
  prediction: TumorType;
  confidence: number;
};

type AnalysisResults = {
  model1: ModelPrediction;
  model2: ModelPrediction;
  model3: ModelPrediction;
  analysis: string; // ✅ Gemini AI full analysis separately
};

export function BrainTumorDetection() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setResults(null);

    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    setSelectedFile(file);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError("Please upload an MRI scan first");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("http://localhost:8000/predict/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to analyze MRI scan");
      }

      const data = await response.json();

      const mappedResults: AnalysisResults = {
        model1: mapModelPrediction(data.predictions[0]),
        model2: mapModelPrediction(data.predictions[1]),
        model3: mapModelPrediction(data.predictions[2]),
        analysis: data.analysis || "No analysis available.",
      };

      setResults(mappedResults);
    } catch (err) {
      console.error(err);
      setError("An error occurred during analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8">
      <UploadCard
        selectedImage={selectedImage}
        handleImageUpload={handleImageUpload}
        handleAnalyze={handleAnalyze}
        isAnalyzing={isAnalyzing}
        error={error}
      />

      {results && (
        <>
          {/* Show model prediction cards */}
          <div className="grid gap-6 md:grid-cols-3">
            <ResultCard result={results.model1} />
            <ResultCard result={results.model2} />
            <ResultCard result={results.model3} />
          </div>

          {/* Show Gemini AI detailed analysis */}
          <Card>
            <CardHeader>
              <CardTitle>🧠 Detailed Medical Analysis</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-700 whitespace-pre-line">
              {results.analysis}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// 🛠 Helper to map model predictions
function mapModelPrediction(data: any): ModelPrediction {
  return {
    modelName: data.model || "Unknown Model",
    prediction: data.prediction,
    confidence: data.confidence,
  };
}

// Upload Card component
function UploadCard({
  selectedImage,
  handleImageUpload,
  handleAnalyze,
  isAnalyzing,
  error,
}: {
  selectedImage: string | null;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAnalyze: () => void;
  isAnalyzing: boolean;
  error: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload MRI Scan</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:bg-gray-50 transition-colors",
              selectedImage ? "border-gray-300" : "border-gray-200"
            )}
            onClick={() => document.getElementById("mri-upload")?.click()}
          >
            {selectedImage ? (
              <div className="flex flex-col items-center">
                <div className="relative w-64 h-64 mb-4">
                  <Image
                    src={selectedImage || "/placeholder.svg"}
                    alt="Uploaded MRI scan"
                    fill
                    className="object-contain"
                  />
                </div>
                <p className="text-sm text-gray-500">Click to change image</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium">Upload MRI Scan</p>
                <p className="text-sm text-gray-500 mt-1">Drag and drop or click to browse</p>
              </div>
            )}
            <input id="mri-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          )}

          <Button onClick={handleAnalyze} disabled={!selectedImage || isAnalyzing} className="w-full">
            {isAnalyzing ? (
              <>
                <span className="mr-2">Analyzing...</span>
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              </>
            ) : (
              <>
                <Brain className="mr-2 h-5 w-5" />
                Analyze MRI Scan
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Single Result Card
function ResultCard({ result }: { result: ModelPrediction }) {
  const isNotumor = result.prediction === "notumor";

  return (
    <Card className={cn("transition-colors", isNotumor ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50")}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{result.modelName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            {isNotumor ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            )}
            <span className={cn("font-medium", isNotumor ? "text-green-700" : "text-red-700")}>
              {capitalize(result.prediction)}
            </span>
          </div>
          <span className="text-sm font-medium">{result.confidence.toFixed(1)}% confidence</span>
        </div>
        <Progress value={result.confidence} className="h-2 bg-gray-200" />
      </CardContent>
    </Card>
  );
}

// Helper
function capitalize(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
