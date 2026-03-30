  const handleScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setMsg("Gemini đang phân tích thẻ...");

    try {
      const genAI = new GoogleGenerativeAI(GEMINI_KEY);
      
      // SỬA DÒNG NÀY: Thêm chữ "-latest" vào sau flash
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }); 
      
      const imagePart = await fileToAiPart(file);
      
      const prompt = "Phân tích ảnh card/bảng hiệu. Trả về JSON: {\"name\": \"...\", \"phone\": \"...\", \"address\": \"...\"}. Chỉ trả về JSON.";
      
      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const aiText = response.text().replace(/```json|```/g, "").trim();
      const aiData = JSON.parse(aiText);

      // ... (Các đoạn code Cloudinary bên dưới giữ nguyên) ...
