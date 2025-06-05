import logging
from flask import Flask, request, jsonify
from PyPDF2 import PdfReader
from flask_cors import CORS
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
from langchain_core.documents import Document
import tempfile
import os
import io
from dotenv import load_dotenv  

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize app and CORS
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])


def process_pdf_and_query(pdf_bytes, query):
    logger.debug("Starting PDF and query processing.")

    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=GOOGLE_API_KEY)
    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=GOOGLE_API_KEY, temperature=0.3)

    # Read and extract text
    logger.debug("Reading PDF content.")
    pdf_reader = PdfReader(io.BytesIO(pdf_bytes))
    documents = []
    for page_num, page in enumerate(pdf_reader.pages):
        text = page.extract_text()
        logger.debug(f"Extracted text from page {page_num + 1}: {text[:100] if text else 'NO TEXT FOUND'}")
        if text:
            documents.append(Document(
                page_content=text,
                metadata={"page": page_num + 1, "source": "uploaded.pdf"}
            ))

    logger.debug(f"Total pages with text extracted: {len(documents)}")

    if not documents:
        logger.info("No readable text found in PDF. Falling back to regular chat.")
        response = llm.invoke(query)
        return response.content  # or response.text if using older API

    # Proceed with document-based QA
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=300,
        separators=["\n\n", "\n", "。", "• ", "; ", ", ", " ", ""],
        length_function=len,
    )
    split_docs = text_splitter.split_documents(documents)
    logger.debug(f"Total text chunks created: {len(split_docs)}")

    if not split_docs:
        logger.info("No chunks generated. Falling back to regular chat.")
        response = llm.invoke(query)
        return response.content

    # Vector store and chains
    vectorstore = FAISS.from_documents(split_docs, embeddings)
    retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

    prompt = ChatPromptTemplate.from_template("""
    Analyze this document and answer the question:
    Context: {context}
    Question: {input}
    Provide a detailed response with page references:""")

    document_chain = create_stuff_documents_chain(llm, prompt)
    retrieval_chain = create_retrieval_chain(retriever, document_chain)

    response = retrieval_chain.invoke({"input": query})
    answer = response['answer']
    sources = {doc.metadata['page'] for doc in response['context']}
    if sources:
        answer += f"\n\nReferences: Pages {sorted(sources)}"

    return answer



@app.route('/api/chatbot', methods=['POST'])
def handle_chat():
    if 'file' not in request.files or 'query' not in request.form:
        logger.warning("Request missing file or query.")
        return jsonify({"error": "Missing file or query"}), 400

    pdf_file = request.files['file']
    query = request.form['query']

    logger.info(f"Received query: {query}")
    try:
        pdf_bytes = pdf_file.read()
        response_text = process_pdf_and_query(pdf_bytes, query)
    except Exception as e:
        logger.exception("Error processing request")
        return jsonify({"error": str(e)}), 500

    return jsonify({"reply": response_text})


if __name__ == '__main__':
    logger.info("Starting Flask server...")
    app.run(host='0.0.0.0', port=5005, debug=True)
