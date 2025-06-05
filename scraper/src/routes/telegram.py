from flask import Flask, request, jsonify
from telethon import TelegramClient
from flask_cors import CORS
import re
from dotenv import load_dotenv
import os
import sys
import atexit
import asyncio
import signal
from pymongo import MongoClient
import threading
from concurrent.futures import ThreadPoolExecutor

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../')))
from scraper.src.Helpers.Telegram.mongoUtils import upload_telegram_chats_to_mongo, updateUserHistory
from scraper.src.Helpers.Telegram.s3 import upload_to_s3

load_dotenv()
API_ID=YOUR_API_ID_HERE
API_HASH=YOUR_API_HASH_HERE

# Global variables for cleanup
active_clients = []
running_tasks = set()
executor = ThreadPoolExecutor(max_workers=4)

def connect_db():
    try:
        client = MongoClient('mongodb+srv://aayushman2702:Lmaoded%4011@cluster0.eivmu.mongodb.net/telegramDB?retryWrites=true&w=majority')
        db = client.get_database('telegramDB')
        print("MongoDB connected successfully")
        return db
    except Exception as e:
        print(f"MongoDB connection error: {e}")
        sys.exit(1)

db = connect_db()

app = Flask(__name__)
CORS(app)

async def cleanup_resources():
    """Clean up all async resources before shutdown"""
    print("Starting cleanup...")
    
    # Cancel all running tasks
    for task in running_tasks.copy():
        if not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            except Exception as e:
                print(f"Error during task cleanup: {e}")
    
    # Disconnect all active clients
    for client in active_clients:
        try:
            if client.is_connected():
                await client.disconnect()
                print("Client disconnected during cleanup")
        except Exception as e:
            print(f"Error disconnecting client during cleanup: {e}")
    
    # Shutdown executor
    executor.shutdown(wait=False)
    print("Cleanup completed")

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    print(f"Received signal {signum}, initiating cleanup...")
    # Run cleanup in the event loop
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(cleanup_resources())
    except RuntimeError:
        # If no event loop is running, create a new one for cleanup
        asyncio.run(cleanup_resources())
    sys.exit(0)

# Register signal handlers
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# Enhanced atexit handler
def enhanced_cleanup():
    print("Python interpreter is shutting down...")
    try:
        # Try to run cleanup if there's an active event loop
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(cleanup_resources())
    except RuntimeError:
        # No event loop available, do synchronous cleanup
        print("No event loop available for async cleanup")
        # Clean up synchronously
        for client in active_clients:
            try:
                if hasattr(client, '_connection') and client._connection:
                    # Force close connection synchronously if possible
                    pass
            except Exception as e:
                print(f"Error in sync cleanup: {e}")

atexit.register(enhanced_cleanup)

async def safe_upload_to_s3(file_path, s3_key):
    """Wrapper for S3 upload with better error handling"""
    try:
        # Run S3 upload in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(executor, upload_to_s3_sync, file_path, s3_key)
        return result
    except Exception as e:
        print(f"Error uploading to S3: {e}")
        return None

def upload_to_s3_sync(file_path, s3_key):
    """Synchronous version of S3 upload"""
    # This would need to be implemented based on your actual S3 upload logic
    # For now, returning a placeholder - replace with your actual sync S3 upload
    import time
    time.sleep(0.1)  # Simulate upload time
    return f"s3://bucket/{s3_key}"

async def scrape_all_chats(phone_number, client, output_base_dir, limit):
    print("Client connected!")
    results = []
    resultId = None

    try:
        count = 0
        async for dialog in client.iter_dialogs():
            count += 1
            if count >= 5:
                break

            chat_name = dialog.name or f"chat_{dialog.id}"
            chat_name = re.sub(r'[<>:"/\\|?*]', '_', chat_name)
            output_dir = os.path.join(output_base_dir, chat_name)
            os.makedirs(output_dir, exist_ok=True)

            print(f"Scraping chat: {chat_name}")
            messages = []
            media_files = []

            try:
                async for message in client.iter_messages(dialog, limit=limit):
                    if message.text:
                        messages.append(f"[{message.date}] {message.sender_id}: {message.text}")
                    if message.media:
                        try:
                            file_path = await client.download_media(message, output_dir)
                            if file_path:
                                media_files.append(file_path)
                        except Exception as e:
                            print(f"Error downloading media: {e}")
                            continue
            except OSError as e:
                if "WinError 64" in str(e):
                    print("Network issue (WinError 64): server closed the connection. Skipping chat...")
                    continue
                else:
                    raise

            # Write chat log
            chat_log_path = os.path.join(output_dir, 'chat_log.txt')
            with open(chat_log_path, 'w', encoding='utf-8') as log_file:
                log_file.write("\n".join(messages))

            try:
                # Create upload tasks but wait for them properly
                upload_tasks = []
                
                # Upload chat log
                chat_upload_task = asyncio.create_task(
                    safe_upload_to_s3(chat_log_path, f"{phone_number}/{chat_name}/chat_log.txt")
                )
                upload_tasks.append(chat_upload_task)
                running_tasks.add(chat_upload_task)

                # Upload media files
                media_upload_tasks = []
                for media_file in media_files:
                    if media_file:
                        media_task = asyncio.create_task(
                            safe_upload_to_s3(media_file, f"{phone_number}/{chat_name}/{os.path.basename(media_file)}")
                        )
                        media_upload_tasks.append(media_task)
                        running_tasks.add(media_task)

                # Wait for all uploads to complete
                chat_logs_s3_url = await chat_upload_task
                running_tasks.discard(chat_upload_task)
                
                media_files_s3_urls = []
                if media_upload_tasks:
                    media_results = await asyncio.gather(*media_upload_tasks, return_exceptions=True)
                    for task in media_upload_tasks:
                        running_tasks.discard(task)
                    
                    media_files_s3_urls = [
                        result for result in media_results 
                        if result is not None and not isinstance(result, Exception)
                    ]

                # Upload to MongoDB
                if chat_logs_s3_url:
                    resultId = await upload_telegram_chats_to_mongo(
                        phone_number, chat_name, chat_logs_s3_url, media_files_s3_urls
                    )

                    print(f"Uploaded Telegram chats for {phone_number} -> {chat_name}")

                    results.append({
                        "chatName": chat_name,
                        "resultId": resultId,
                        "messages": len(messages),
                        "mediaFilesCount": len(media_files_s3_urls),
                    })

            except Exception as e:
                print(f"Error uploading to S3 or MongoDB for chat {chat_name}: {e}")
    
    except Exception as e:
        print(f"Unexpected error during chat scraping: {e}")

    print("Scraping all chats completed!")
    return resultId

@app.route('/telegram', methods=['POST'])
async def scrape_all_chats_route():
    data = request.get_json()
    limit = data.get('limit', 100)
    userId = data.get('userId')
    startUrls = data.get('startUrls')

    if not userId or not isinstance(userId, str):
        return jsonify({"error": "'userId' is required and must be a string"}), 400

    if not startUrls or not isinstance(startUrls, list):
        return jsonify({"error": "'startUrls' must be a non-empty array"}), 400

    output_base_dir = 'output'
    results = {}
    clients_to_cleanup = []

    try:
        for phone_number in startUrls:
            client = None
            try:
                print(f"Processing phone number: {phone_number}")
                session_name = f'session_{phone_number}'
                client = TelegramClient(session_name, API_ID, API_HASH)
                
                # Track client for cleanup
                active_clients.append(client)
                clients_to_cleanup.append(client)
                
                await client.start(phone_number)

                sessionId = await scrape_all_chats(phone_number, client, output_base_dir, limit)
                results[phone_number] = sessionId

                if sessionId:
                    await updateUserHistory(userId, phone_number, sessionId, 'telegram')
                else:
                    print(f"Failed to store session for phone number {phone_number}")

            except Exception as e:
                print(f"Error processing {phone_number}: {e}")
                results[phone_number] = {"error": str(e)}
            
            finally:
                if client:
                    try:
                        await client.disconnect()
                        print(f"Disconnected Telegram client for {phone_number}")
                        if client in active_clients:
                            active_clients.remove(client)
                    except Exception as e:
                        print(f"Error disconnecting client: {e}")

    except Exception as e:
        print(f"Unexpected error in route: {e}")
        return jsonify({"error": str(e)}), 500
    
    finally:
        # Ensure all clients are cleaned up
        for client in clients_to_cleanup:
            if client in active_clients:
                try:
                    await client.disconnect()
                    active_clients.remove(client)
                except Exception as e:
                    print(f"Error in final client cleanup: {e}")

    return jsonify({
        "status": "success",
        "chats": results
    })

@app.route('/telegram/users', methods=['GET'])
def get_telegram_users():
    try:
        print("Fetching all users from database...")
        users = list(db.telegram_users.find({}, {"_id": 0}))
        if not users:
            print("No users found in the database")
            return jsonify({"message": "No users found"}), 404
        print(f"Found {len(users)} users")
        return jsonify(users), 200
    except Exception as e:
        print(f"Error fetching users: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/telegram/users/<username>', methods=['GET'])
def get_telegram_user(username):
    try:
        print(f"Fetching user with username: {username}")
        user = db.telegram_users.find_one({"username": username}, {"_id": 0})
        if not user:
            print(f"User not found: {username}")
            return jsonify({"message": "User not found"}), 404
        print(f"User found: {username}")
        return jsonify(user), 200
    except Exception as e:
        print(f"Error fetching user: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    try:
        app.run(host='0.0.0.0', port=3005)
    except KeyboardInterrupt:
        print("Server interrupted by user")
    finally:
        # Final cleanup
        try:
            asyncio.run(cleanup_resources())
        except Exception as e:
            print(f"Error during final cleanup: {e}")