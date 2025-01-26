import boto3
from botocore.exceptions import NoCredentialsError
from dotenv import load_dotenv
from urllib.parse import quote

load_dotenv()

AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID_HERE
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY_HERE
AWS_REGION=YOUR_AWS_REGION_HERE
S3_BUCKET_NAME=YOUR_S3_BUCKET_NAME_HERE
MONGO_URI=YOUR_MONGO_URI_HERE
MONGO_DB=YOUR_MONGO_DB_HERE

s3 = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION
)

async def upload_to_s3(file_path, s3_key):
    """
    Uploads a file to an S3 bucket.

    Args:
        file_path (str): Path to the local file.
        s3_key (str): Key for the file in the S3 bucket.

    Returns:
        str: The S3 URL of the uploaded file.
    """
    try:
       
        s3.upload_file(file_path, S3_BUCKET_NAME, s3_key)
        encoded_s3_key = quote(s3_key, safe="/")
        s3_url = f"https://{S3_BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{encoded_s3_key}"
        
        print(f"Uploaded {file_path} to {s3_url}")
        return s3_url
    except FileNotFoundError:
        print(f"File {file_path} not found.")
    except NoCredentialsError:
        print("AWS credentials not found.")
    except Exception as e:
        print(f"Error uploading to S3: {e}")
    return None
