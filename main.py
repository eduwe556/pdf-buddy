from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from typing import List
import fitz  # PyMuPDF
import io
import zipfile

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== COMPRESS ====================
@app.post("/compress-pdf/")
async def compress_pdf(file: UploadFile = File(...), quality: int = Form(150)):
    contents = await file.read()
    doc = fitz.open(stream=contents, filetype="pdf")
    new_doc = fitz.open()
    for page in doc:
        pix = page.get_pixmap(dpi=quality)
        img_bytes = pix.tobytes("jpeg")
        rect = page.rect
        new_page = new_doc.new_page(width=rect.width, height=rect.height)
        new_page.insert_image(rect, stream=img_bytes)
    doc.close()
    output_buffer = io.BytesIO()
    new_doc.save(output_buffer, garbage=4, deflate=True)
    new_doc.close()
    data = output_buffer.getvalue()
    output_buffer.close()
    return Response(content=data, media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename=compressed_{file.filename}"})

# ==================== MERGE ====================
@app.post("/merge-pdf/")
async def merge_pdfs(files: List[UploadFile] = File(...)):
    merged_doc = fitz.open()
    for f in files:
        contents = await f.read()
        doc = fitz.open(stream=contents, filetype="pdf")
        merged_doc.insert_pdf(doc)
        doc.close()
    output_buffer = io.BytesIO()
    merged_doc.save(output_buffer, garbage=4, deflate=True)
    merged_doc.close()
    data = output_buffer.getvalue()
    output_buffer.close()
    return Response(content=data, media_type="application/pdf",
                    headers={"Content-Disposition": "attachment; filename=merged_output.pdf"})

# ==================== SPLIT ====================
def parse_page_range(range_str: str, total_pages: int) -> list:
    pages = set()
    if not range_str.strip():
        return list(range(total_pages))  # all pages
    parts = range_str.split(',')
    for part in parts:
        part = part.strip()
        if not part:
            continue
        if '-' in part:
            start, end = part.split('-')
            start = int(start.strip())
            end = int(end.strip())
            start = max(1, min(start, total_pages))
            end = max(1, min(end, total_pages))
            if start > end:
                start, end = end, start
            for p in range(start, end + 1):
                pages.add(p - 1)
        else:
            p = int(part)
            if 1 <= p <= total_pages:
                pages.add(p - 1)
    return sorted(pages)

@app.post("/split-pdf/")
async def split_pdf(file: UploadFile = File(...), range: str = Form(...)):
    contents = await file.read()
    doc = fitz.open(stream=contents, filetype="pdf")
    total_pages = len(doc)
    if total_pages == 0:
        doc.close()
        return Response("PDF has no pages.", status_code=400)
    try:
        page_indices = parse_page_range(range, total_pages)
    except ValueError:
        doc.close()
        return Response("Invalid page range format. Use e.g. 1-3, 5, 7-10", status_code=400)
    if not page_indices:
        doc.close()
        return Response(f"No valid pages found. PDF has {total_pages} pages.", status_code=400)
    doc.select(page_indices)
    output_buffer = io.BytesIO()
    doc.save(output_buffer, garbage=4, deflate=True)
    doc.close()
    data = output_buffer.getvalue()
    output_buffer.close()
    return Response(content=data, media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename=split_{file.filename}"})

# ==================== PDF TO IMAGES ====================
@app.post("/pdf-to-images/")
async def pdf_to_images(
    file: UploadFile = File(...),
    format: str = Form("jpeg"),
    dpi: int = Form(300)
):
    contents = await file.read()
    doc = fitz.open(stream=contents, filetype="pdf")
    
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as zip_file:
        for i, page in enumerate(doc):
            pix = page.get_pixmap(dpi=dpi)
            img_bytes = pix.tobytes(format)
            ext = "png" if format == "png" else "jpg"
            zip_file.writestr(f"page_{i+1}.{ext}", img_bytes)
    
    doc.close()
    zip_buffer.seek(0)
    data = zip_buffer.getvalue()
    zip_buffer.close()
    
    return Response(
        content=data,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=images.zip"}
    )

# ==================== EXTRACT TEXT ====================
# ==================== EXTRACT TEXT ====================
@app.post("/extract-text/")
async def extract_text(
    file: UploadFile = File(...),
    range: str = Form("")  # We'll ignore the range for now to test
):
    try:
        # 1. Read the file
        contents = await file.read()
        
        # 2. Open the PDF
        doc = fitz.open(stream=contents, filetype="pdf")
        
        # 3. Extract ALL text from ALL pages
        full_text = ""
        for i, page in enumerate(doc):
            text = page.get_text()
            if text.strip():
                full_text += f"--- Page {i+1} ---\n{text}\n\n"
        
        doc.close()
        
        # 4. Check if we got anything
        if not full_text.strip():
            return Response(
                content="No text found in this PDF. It might be scanned images.",
                media_type="text/plain",
                status_code=400,
                headers={"Access-Control-Allow-Origin": "*"}  # Force the header
            )
        
        # 5. Return the text file
        return Response(
            content=full_text.encode("utf-8"),
            media_type="text/plain",
            headers={
                "Content-Disposition": "attachment; filename=extracted_text.txt",
                "Access-Control-Allow-Origin": "*"  # Force the header
            }
        )
    except Exception as e:
        # Catch any error and return it with the CORS header
        return Response(
            content=f"Error: {str(e)}",
            media_type="text/plain",
            status_code=500,
            headers={"Access-Control-Allow-Origin": "*"}  # Force the header
        )
if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)