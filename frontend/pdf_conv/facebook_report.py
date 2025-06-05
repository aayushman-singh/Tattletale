from pymongo import MongoClient
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.units import inch
from datetime import datetime
import os
import requests
import tempfile
import shutil
from urllib.parse import urlparse
import time

# MongoDB Configuration
MONGO_URI=YOUR_MONGO_URI_HERE
DATABASE_NAME=YOUR_DATABASE_NAME_HERE
COLLECTION_NAME=YOUR_COLLECTION_NAME_HERE

class FacebookDataReport:
    def __init__(self):
        try:
            self.client = MongoClient(MONGO_URI)
            self.db = self.client[DATABASE_NAME]
            self.collection = self.db[COLLECTION_NAME]
            self.temp_dir = tempfile.mkdtemp()
            self.client.server_info()
            print(f"Successfully connected to MongoDB database: {DATABASE_NAME}")
        except Exception as e:
            print(f"Error connecting to MongoDB: {str(e)}")
            raise
        self.styles = getSampleStyleSheet()
        self._init_styles()

    def _init_styles(self):
        self.styles.add(ParagraphStyle(
            name='NIATitle',
            parent=self.styles['Heading1'],
            fontSize=32,
            spaceAfter=40,
            textColor=colors.HexColor('#002060'),
            alignment=1,
            fontName='Helvetica-Bold'
        ))
        self.styles.add(ParagraphStyle(
            name='NIAHeader',
            parent=self.styles['Heading2'],
            fontSize=18,
            spaceAfter=20,
            textColor=colors.HexColor('#002060'),
            alignment=1,
            fontName='Helvetica-Bold'
        ))
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceAfter=15,
            textColor=colors.HexColor('#000000'),
            borderWidth=1,
            borderColor=colors.HexColor('#000000'),
            borderPadding=8,
            backColor=colors.HexColor('#E8E8E8'),
            fontName='Helvetica-Bold'
        ))
        self.styles.add(ParagraphStyle(
            name='DataHeader',
            parent=self.styles['Heading3'],
            fontSize=12,
            spaceAfter=10,
            textColor=colors.HexColor('#000000'),
            fontName='Helvetica-Bold'
        ))
        self.styles.add(ParagraphStyle(
            name='Content',
            parent=self.styles['Normal'],
            fontSize=11,
            spaceAfter=8,
            textColor=colors.HexColor('#000000'),
            fontName='Helvetica'
        ))
        self.styles.add(ParagraphStyle(
            name='EvidenceLabel',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#666666'),
            fontName='Helvetica-Oblique'
        ))
        self.styles.add(ParagraphStyle(
            name='Footer',
            parent=self.styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor('#888888'),
            alignment=1,
            fontName='Helvetica-Oblique'
        ))

    def download_file(self, url):
        try:
            response = requests.get(url, stream=True)
            response.raise_for_status()
            filename = os.path.basename(urlparse(url).path)
            if not filename:
                filename = f"file_{int(time.time())}"
            content_type = response.headers.get('content-type', '')
            if 'image' in content_type or url.endswith(('.png', '.jpg', '.jpeg')):
                if not filename.endswith(('.jpg', '.png', '.jpeg')):
                    filename += '.png'
            local_path = os.path.join(self.temp_dir, filename)
            with open(local_path, 'wb') as f:
                shutil.copyfileobj(response.raw, f)
            return local_path
        except Exception as e:
            print(f"Error downloading file from {url}: {str(e)}")
            return None

    def add_cover_page(self, story, username):
        story.append(Paragraph("National Investigation Agency (NIA)", self.styles['NIATitle']))
        story.append(Spacer(1, 20))
        story.append(Paragraph("Social Media User Data Report", self.styles['NIAHeader']))
        story.append(Spacer(1, 40))
        story.append(Paragraph(f"Platform: Facebook", self.styles['Content']))
        story.append(Paragraph(f"Subject Username: <b>{username}</b>", self.styles['Content']))
        story.append(Paragraph(f"Report Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", self.styles['Content']))
        story.append(Spacer(1, 60))
        story.append(Paragraph("<i>Confidential: For Official Use Only</i>", self.styles['Footer']))
        story.append(PageBreak())

    def format_profile_section(self, username, profile_url):
        story = []
        story.append(Paragraph("PROFILE INFORMATION", self.styles['SectionHeader']))
        story.append(Spacer(1, 20))
        story.append(Paragraph(f"Username: {username}", self.styles['DataHeader']))
        if profile_url:
            local_path = self.download_file(profile_url)
            if local_path and local_path.endswith(('.jpg', '.jpeg', '.png')):
                img = Image(local_path, width=2*inch, height=2*inch)
                story.append(img)
                story.append(Paragraph(
                    f"Evidence ID: PROFILE-{datetime.now().strftime('%Y%m%d')}", 
                    self.styles['EvidenceLabel']
                ))
            else:
                story.append(Paragraph(
                    "Image could not be retrieved due to access restrictions.",
                    self.styles['EvidenceLabel']
                ))
        return story

    def format_friends_section(self, friends_list):
        story = []
        story.append(Paragraph("FRIENDS LIST", self.styles['SectionHeader']))
        story.append(Spacer(1, 20))
        if not friends_list:
            story.append(Paragraph("No friends data available", self.styles['Content']))
            return story
        for friend in friends_list:
            story.append(Paragraph(f"Friend #{friend.get('index', '-')}", self.styles['DataHeader']))
            story.append(Paragraph(f"Name: {friend.get('userName', '-')}", self.styles['Content']))
            story.append(Paragraph(f"Profile URL: {friend.get('profileUrl', '-')}", self.styles['Content']))
            if friend.get('profilePicUrl'):
                local_path = self.download_file(friend['profilePicUrl'])
                if local_path and local_path.endswith(('.jpg', '.jpeg', '.png')):
                    img = Image(local_path, width=2*inch, height=2*inch)
                    story.append(img)
                    story.append(Paragraph(
                        f"Evidence ID: FRIEND-{datetime.now().strftime('%Y%m%d')}-{friend.get('index', '-')}", 
                        self.styles['EvidenceLabel']
                    ))
                else:
                    story.append(Paragraph(
                        "Image could not be retrieved due to access restrictions.",
                        self.styles['EvidenceLabel']
                    ))
            story.append(Spacer(1, 20))
        return story

    def format_posts_section(self, posts):
        story = []
        story.append(Paragraph("POSTS", self.styles['SectionHeader']))
        story.append(Spacer(1, 20))
        if not posts:
            story.append(Paragraph("No posts data available", self.styles['Content']))
            return story
        for post in posts:
            story.append(Paragraph(f"Post #{post.get('postIndex', '-')}", self.styles['DataHeader']))
            story.append(Paragraph(f"Timestamp: {post.get('timestamp', '-')}", self.styles['Content']))
            if post.get('s3Url'):
                local_path = self.download_file(post['s3Url'])
                if local_path and local_path.endswith(('.jpg', '.jpeg', '.png')):
                    img = Image(local_path, width=6*inch, height=4*inch)
                    story.append(img)
                    story.append(Paragraph(
                        f"Evidence ID: POST-{datetime.now().strftime('%Y%m%d')}-{post.get('postIndex', '-')}", 
                        self.styles['EvidenceLabel']
                    ))
                else:
                    story.append(Paragraph(
                        "Image could not be retrieved due to access restrictions.",
                        self.styles['EvidenceLabel']
                    ))
            story.append(Spacer(1, 20))
        return story

    def format_timelines_section(self, timelines):
        story = []
        story.append(Paragraph("TIMELINES", self.styles['SectionHeader']))
        story.append(Spacer(1, 20))
        if not timelines:
            story.append(Paragraph("No timeline data available", self.styles['Content']))
            return story
        for key, url in timelines.items():
            story.append(Paragraph(f"Timeline: {key}", self.styles['DataHeader']))
            story.append(Paragraph(f"URL: {url}", self.styles['Content']))
            story.append(Spacer(1, 10))
        return story

    def format_chats_section(self, chats_section):
        story = []
        story.append(Paragraph("CHATS / MESSAGES", self.styles['SectionHeader']))
        story.append(Spacer(1, 20))
        if not chats_section:
            story.append(Paragraph("No chat/message data available", self.styles['Content']))
            return story
        for idx, chat in enumerate(chats_section, 1):
            story.append(Paragraph(f"Chat #{idx}", self.styles['DataHeader']))
            story.append(Paragraph(f"Receiver Username: {chat.get('receiverUsername', '-')}", self.styles['Content']))
            if chat.get('lastUpdated'):
                story.append(Paragraph(f"Last Updated: {chat['lastUpdated']}", self.styles['Content']))
            if chat.get('chatLogURL'):
                story.append(Paragraph(f"Chat Log URL: {chat['chatLogURL']}", self.styles['Content']))
            if chat.get('media'):
                story.append(Paragraph(f"Media: {chat['media']}", self.styles['Content']))
            # Messages array
            if chat.get('messages'):
                story.append(Paragraph("Messages:", self.styles['Content']))
                for m_idx, msg in enumerate(chat['messages'], 1):
                    story.append(Paragraph(f"{m_idx}. {msg}", self.styles['Content']))
            # Screenshots
            if chat.get('screenshots'):
                story.append(Paragraph("Screenshots:", self.styles['Content']))
                for s_idx, screenshot_url in enumerate(chat['screenshots'], 1):
                    local_path = self.download_file(screenshot_url)
                    if local_path and local_path.endswith(('.jpg', '.jpeg', '.png')):
                        img = Image(local_path, width=4*inch, height=3*inch)
                        story.append(img)
                        story.append(Paragraph(
                            f"Evidence ID: CHAT-SHOT-{datetime.now().strftime('%Y%m%d')}-{idx}-{s_idx}",
                            self.styles['EvidenceLabel']
                        ))
                    else:
                        story.append(Paragraph(
                            "Image could not be retrieved due to access restrictions.",
                            self.styles['EvidenceLabel']
                        ))
            story.append(Spacer(1, 20))
        return story

    def extract_actual_structure(self, user_data):
        # Extract profile and timelines from chats
        profile_url = None
        timelines = {}
        chats_section = []
        if 'chats' in user_data:
            for chat in user_data['chats']:
                # Profile
                if 'profile' in chat:
                    profile_url = chat['profile']
                # Timelines
                for k, v in chat.items():
                    if k.startswith('timeline'):
                        timelines[k] = v
                # Chats/Messages
                if 'receiverUsername' in chat:
                    chats_section.append({
                        'receiverUsername': chat.get('receiverUsername'),
                        'chatLogURL': chat.get('chatLogURL'),
                        'messages': chat.get('messages', []),
                        'screenshots': chat.get('screenshots', []),
                        'lastUpdated': chat.get('lastUpdated'),
                        'media': chat.get('media')
                    })
        # Extract friends
        friends_list = user_data.get('friends_list', [])
        # Extract posts
        posts = []
        for k, v in user_data.items():
            if k.startswith('post_') and isinstance(v, dict):
                post_obj = v.copy()
                post_obj['postIndex'] = int(k.split('_')[1]) if '_' in k and k.split('_')[1].isdigit() else 0
                posts.append(post_obj)
        posts.sort(key=lambda x: x.get('postIndex', 0))
        username = user_data.get('username', '-')
        return username, profile_url, friends_list, posts, timelines, chats_section

    def generate_report(self, username, output_path):
        try:
            user_data = self.collection.find_one({"username": username})
            if not user_data:
                raise ValueError(f"No data found for username: {username}")
            os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else '.', exist_ok=True)
            doc = SimpleDocTemplate(
                output_path,
                pagesize=landscape(A4),
                rightMargin=30,
                leftMargin=30,
                topMargin=30,
                bottomMargin=30
            )
            story = []
            # Add cover/title page
            self.add_cover_page(story, username)
            # Extract all details
            username, profile_url, friends_list, posts, timelines, chats_section = self.extract_actual_structure(user_data)
            # Add profile section
            story.extend(self.format_profile_section(username, profile_url))
            story.append(PageBreak())
            # Add friends section
            story.extend(self.format_friends_section(friends_list))
            story.append(PageBreak())
            # Add posts section
            story.extend(self.format_posts_section(posts))
            story.append(PageBreak())
            # Add timelines section
            story.extend(self.format_timelines_section(timelines))
            story.append(PageBreak())
            # Add chats/messages section
            story.extend(self.format_chats_section(chats_section))
            # Build the PDF with page numbers
            def add_page_number(canvas, doc):
                page_num = canvas.getPageNumber()
                text = f"Page {page_num} | National Investigation Agency (NIA) - Confidential"
                canvas.saveState()
                canvas.setFont('Helvetica-Oblique', 9)
                canvas.setFillColor(colors.HexColor('#888888'))
                canvas.drawCentredString(420, 20, text)
                canvas.restoreState()
            doc.build(story, onLaterPages=add_page_number, onFirstPage=add_page_number)
            shutil.rmtree(self.temp_dir)
            print(f"Report generated successfully: {output_path}")
            return True
        except Exception as e:
            print(f"Error generating report: {str(e)}")
            if os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir)
            return False

def main():
    report_generator = FacebookDataReport()
    username = input("Enter Facebook username to generate report: ")
    output_path = f"{username}_facebook_report.pdf"
    report_generator.generate_report(username, output_path)

if __name__ == "__main__":
    main() 