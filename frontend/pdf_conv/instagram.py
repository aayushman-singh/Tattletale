from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT
import pymongo
from datetime import datetime
import os
import tempfile
import requests
import shutil
from urllib.parse import urlparse
import re

# MongoDB Connection Constants
MONGO_URI = "mongodb+srv://aayushman2702:Lmaoded%4011@cluster0.eivmu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
DATABASE_NAME = "instagramDB"
COLLECTION_NAME = "instagram_users"

class InstagramDataReport:
    def __init__(self):
        try:
            self.client = pymongo.MongoClient(MONGO_URI)
            self.db = self.client[DATABASE_NAME]
            self.collection = self.db[COLLECTION_NAME]
            self.temp_dir = tempfile.mkdtemp()
            print(f"Successfully connected to MongoDB database: {DATABASE_NAME}")
        except Exception as e:
            print(f"Error connecting to MongoDB: {str(e)}")
            raise
        
        self.styles = getSampleStyleSheet()
        self._init_custom_styles()

    def _init_custom_styles(self):
        """Initialize custom styles for the PDF."""
        # Ensure Normal style exists
        if 'Normal' not in self.styles:
            self.styles['Normal'] = ParagraphStyle(
                'Normal',
                fontName='Helvetica',
                fontSize=11,
                leading=13,
                textColor=colors.black
            )

        # Title Style
        self.styles.add(ParagraphStyle(
            name='CaseTitle',
            parent=self.styles['Normal'],
            fontSize=28,
            spaceAfter=30,
            textColor=colors.black,
            alignment=1,  # Center alignment
        ))
        
        # Official Header Style
        self.styles.add(ParagraphStyle(
            name='OfficialHeader',
            parent=self.styles['Normal'],
            fontSize=16,
            spaceAfter=20,
            textColor=colors.black,
            borderWidth=2,
            borderColor=colors.black,
            borderPadding=15,
            backColor=colors.HexColor('#F5F5F5'),
            alignment=1,
        ))
        
        # Section Headers
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Normal'],
            fontSize=14,
            spaceAfter=15,
            textColor=colors.black,
            borderWidth=1,
            borderColor=colors.black,
            borderPadding=8,
            backColor=colors.HexColor('#E8E8E8'),
        ))
        
        # Data Headers
        self.styles.add(ParagraphStyle(
            name='DataHeader',
            parent=self.styles['Normal'],
            fontSize=12,
            spaceAfter=10,
            textColor=colors.black,
        ))
        
        # Evidence Label Style
        self.styles.add(ParagraphStyle(
            name='EvidenceLabel',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#666666'),
            fontName='Helvetica-Oblique'
        ))

    def download_file(self, url):
        """Download a file from URL and return the local path."""
        try:
            response = requests.get(url, stream=True)
            response.raise_for_status()
            
            filename = os.path.basename(urlparse(url).path)
            if not filename:
                filename = f"file_{int(datetime.now().timestamp())}"
            
            local_path = os.path.join(self.temp_dir, filename)
            
            with open(local_path, 'wb') as f:
                shutil.copyfileobj(response.raw, f)
            
            return local_path
        except Exception as e:
            print(f"Error downloading file from {url}: {str(e)}")
            return None

    def format_cell_content(self, content, max_length=40):
        """Format cell content to prevent text overflow"""
        if isinstance(content, str):
            if content.startswith('http'):
                # Shorten URLs to keep only the last part
                parts = content.split('/')
                return f".../{parts[-1]}" if len(parts) > 1 else content[:max_length]
            return content if len(content) <= max_length else f"{content[:max_length]}..."
        return str(content)

    def format_user_data(self, user_data):
        """Format user data to show only username"""
        if isinstance(user_data, dict):
            return user_data.get('username', 'Unknown')
        return str(user_data)

    def create_user_profile_table(self, profile_data):
        """Create the user profile section of the PDF"""
        data = [
            ['Username', self.format_cell_content(profile_data.get('username', ''))],
            ['Full Name', self.format_cell_content(profile_data.get('full_name', ''))],
            ['Biography', self.format_cell_content(profile_data.get('biography', ''))],
            ['Followers Count', str(profile_data.get('follower_count', 0))],
            ['Follows Count', str(profile_data.get('following_count', 0))],
            ['Has Channel', 'Yes' if profile_data.get('hasChannel', False) else 'No'],
            ['Highlight Reel Count', str(profile_data.get('highlightReelCount', 0))],
            ['Is Business Account', 'Yes' if profile_data.get('isBusinessAccount', False) else 'No'],
            ['ID', self.format_cell_content(profile_data.get('instagram_id', ''))]
        ]
        
        return Table(data, colWidths=[2*inch, 4*inch], rowHeights=[0.3*inch] * len(data))

    def create_posts_table(self, posts_data):
        """Create the posts section of the PDF with a compact, professional layout."""
        headers = ['Post URL', 'Type', 'Caption', 'Comments', 'Likes', 'Timestamp']
        data = [headers]
        for post in posts_data:
            post_url = post.get('url', 'N/A')
            # Shorten URL display but keep it clickable
            if post_url and post_url != 'N/A':
                url_display = post_url.split('/')[-1]
                formatted_url = f'<link href="{post_url}"><font color="blue"><u>{url_display}</u></font></link>'
            else:
                formatted_url = 'N/A'
            # Truncate and wrap caption
            caption = post.get('caption', '')
            if len(caption) > 50:
                caption = caption[:47] + '...'
            caption_paragraph = Paragraph(caption, self.styles['Normal'])
            # Format numbers and timestamp
            comments = str(post.get('commentsCount', post.get('comments', 0)))
            likes = str(post.get('likesCount', post.get('likes', 0)))
            timestamp = self.format_cell_content(post.get('timestamp', ''), 16)
            data.append([
                Paragraph(formatted_url, self.styles['Normal']),
                self.format_cell_content(post.get('type', ''), 10),
                caption_paragraph,
                comments,
                likes,
                timestamp
            ])
        # Best-fit column widths for A4 portrait
        colWidths = [1.2*inch, 0.7*inch, 2.2*inch, 0.7*inch, 0.7*inch, 1.0*inch]
        table = Table(data, colWidths=colWidths, rowHeights=[0.3*inch] * len(data))
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),  # Smaller font for compactness
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('PADDING', (0, 0), (-1, -1), 4),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),   # Post URL left
            ('ALIGN', (1, 0), (1, -1), 'CENTER'), # Type center
            ('ALIGN', (2, 0), (2, -1), 'LEFT'),   # Caption left
            ('ALIGN', (3, 0), (4, -1), 'RIGHT'),  # Comments/Likes right
            ('ALIGN', (5, 0), (5, -1), 'LEFT'),   # Timestamp left
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        return table

    def create_followers_following_table(self, users, title):
        """Create a formatted table for followers or following"""
        data = [[title]]
        for user in users:
            username = self.format_user_data(user)
            data.append([username])
        
        return Table(data, colWidths=[6*inch], rowHeights=[0.3*inch] * len(data))

    def create_messages_table(self, messages_data):
        """Create the messages section of the PDF with media and screenshots."""
        headers = ['Chat Log URL', 'Media', 'Screenshots', 'Timestamp']
        data = [headers]
        
        for message in messages_data:
            chat_log_url = message.get('chatLogURL', 'N/A')
            media_urls = message.get('media', [])
            screenshots = message.get('screenshots', [])
            
            # Format chat log URL
            if chat_log_url and chat_log_url != 'N/A':
                url_display = chat_log_url.split('/')[-1]
                formatted_url = f'<link href="{chat_log_url}"><font color="blue"><u>{url_display}</u></font></link>'
            else:
                formatted_url = 'N/A'
            
            # Format media URLs
            media_text = '\n'.join([f'<link href="{url}"><font color="blue"><u>Media {i+1}</u></font></link>' 
                                  for i, url in enumerate(media_urls)]) if media_urls else 'None'
            
            # Format screenshots
            screenshots_text = '\n'.join([f'<link href="{url}"><font color="blue"><u>Screenshot {i+1}</u></font></link>' 
                                        for i, url in enumerate(screenshots)]) if screenshots else 'None'
            
            data.append([
                Paragraph(formatted_url, self.styles['Normal']),
                Paragraph(media_text, self.styles['Normal']),
                Paragraph(screenshots_text, self.styles['Normal']),
                self.format_cell_content(message.get('timestamp', ''))
            ])
        
        colWidths = [2*inch, 2*inch, 2*inch, 1.5*inch]
        table = Table(data, colWidths=colWidths, rowHeights=[0.3*inch] * len(data))
        return table

    def generate_report(self, username, output_path):
        """Generate the complete report."""
        try:
            print(f"Starting report generation for username: {username}")
            # Fetch user data
            user_data = self.collection.find_one({'username': username})
            if not user_data:
                print(f"User {username} not found in the database")
                return
            
            print("User data retrieved successfully")
            print(f"User data keys: {list(user_data.keys())}")
            
            # Create PDF document
            doc = SimpleDocTemplate(
                output_path,
                pagesize=A4,
                rightMargin=50,
                leftMargin=50,
                topMargin=50,
                bottomMargin=50
            )

            story = []

            # Official Header Page
            story.append(Paragraph("CONFIDENTIAL", self.styles['CaseTitle']))
            story.append(Spacer(1, 30))
            story.append(Paragraph("Digital Evidence Report", self.styles['OfficialHeader']))
            story.append(Spacer(1, 20))
            story.append(Paragraph("Instagram Account Investigation", self.styles['OfficialHeader']))
            story.append(Spacer(1, 40))
            
            # Case Information
            story.append(Paragraph("CASE DETAILS", self.styles['SectionHeader']))
            story.append(Paragraph(f"Subject Username: {username}", self.styles['DataHeader']))
            story.append(Paragraph(f"Report Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", self.styles['Normal']))
            story.append(Paragraph(f"Report Reference: IG-{datetime.now().strftime('%Y%m%d-%H%M%S')}", self.styles['Normal']))
            story.append(Spacer(1, 20))

            print("Adding profile section")
            # Profile Picture
            profile = user_data.get('profile', {})
            if profile.get('profilePicUrl'):
                story.append(Paragraph("SUBJECT PROFILE IMAGE", self.styles['SectionHeader']))
                local_path = self.download_file(profile['profilePicUrl'])
                if local_path:
                    img = Image(local_path, width=3*inch, height=3*inch)
                    story.append(img)
                    story.append(Paragraph(f"Evidence ID: PRF-{datetime.now().strftime('%Y%m%d')}-01", 
                                        self.styles['EvidenceLabel']))
            
            story.append(PageBreak())

            # Evidence Index
            story.append(Paragraph("EVIDENCE INDEX", self.styles['SectionHeader']))
            story.append(Paragraph("1. Profile Information", self.styles['DataHeader']))
            story.append(Paragraph("2. Timeline Activity (Posts)", self.styles['DataHeader']))
            story.append(Paragraph("3. Following List", self.styles['DataHeader']))
            story.append(Paragraph("4. Messages and Communications", self.styles['DataHeader']))
            story.append(Paragraph("5. Login Activity", self.styles['DataHeader']))
            story.append(PageBreak())

            print("Adding profile information section")
            # Add Profile Section
            story.append(Paragraph("USER PROFILE", self.styles['SectionHeader']))
            profile_table = self.create_user_profile_table(profile)
            profile_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.lightblue),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('PADDING', (0, 0), (-1, -1), 6),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            story.append(profile_table)
            story.append(Spacer(1, 20))
            
            print("Adding posts section")
            # Add Posts Section
            story.append(Paragraph("DIGITAL CONTENT", self.styles['SectionHeader']))
            timeline = user_data.get('timeline', [])
            posts_table = self.create_posts_table(timeline)
            posts_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('PADDING', (0, 0), (-1, -1), 6),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            story.append(posts_table)
            story.append(Spacer(1, 20))
            
            print("Adding following section")
            # Add Following Section
            story.append(Paragraph("KNOWN ASSOCIATES", self.styles['SectionHeader']))
            following = user_data.get('following', [])
            following_table = self.create_followers_following_table(following, 'Following')
            following_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('PADDING', (0, 0), (-1, -1), 6),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
            ]))
            story.append(following_table)
            story.append(Spacer(1, 20))

            print("Adding messages section")
            # Add Messages Section
            story.append(Paragraph("MESSAGES AND COMMUNICATIONS", self.styles['SectionHeader']))
            chats = user_data.get('chats', [])
            messages_table = self.create_messages_table(chats)
            messages_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('PADDING', (0, 0), (-1, -1), 6),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            story.append(messages_table)
            story.append(Spacer(1, 20))

            print("Adding login activity section")
            # Add Login Activity Section
            login_activity = user_data.get('login_activity', {})
            sessions = login_activity.get('sessions', [])
            suspicious_logins = login_activity.get('suspicious_logins', [])
            story.append(Paragraph("LOGIN ACTIVITY", self.styles['SectionHeader']))
            # Sessions Table
            if sessions:
                session_headers = ['Timestamp', 'IP Address', 'Location', 'Device']
                session_data = [session_headers]
                for session in sessions:
                    session_data.append([
                        self.format_cell_content(session.get('timestamp', '')),
                        self.format_cell_content(session.get('ip', '')),
                        self.format_cell_content(session.get('location', '')),
                        self.format_cell_content(session.get('device', '')),
                    ])
                session_table = Table(session_data, colWidths=[1.5*inch, 1.5*inch, 2*inch, 2*inch], rowHeights=[0.3*inch] * len(session_data))
                session_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black),
                    ('PADDING', (0, 0), (-1, -1), 6),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 0), (-1, -1), 10),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ]))
                story.append(Paragraph("Sessions:", self.styles['DataHeader']))
                story.append(session_table)
                story.append(Spacer(1, 10))
            # Suspicious Logins Table
            if suspicious_logins:
                susp_headers = ['Timestamp', 'IP Address', 'Location', 'Device']
                susp_data = [susp_headers]
                for susp in suspicious_logins:
                    susp_data.append([
                        self.format_cell_content(susp.get('timestamp', '')),
                        self.format_cell_content(susp.get('ip', '')),
                        self.format_cell_content(susp.get('location', '')),
                        self.format_cell_content(susp.get('device', '')),
                    ])
                susp_table = Table(susp_data, colWidths=[1.5*inch, 1.5*inch, 2*inch, 2*inch], rowHeights=[0.3*inch] * len(susp_data))
                susp_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black),
                    ('PADDING', (0, 0), (-1, -1), 6),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 0), (-1, -1), 10),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ]))
                story.append(Paragraph("Suspicious Logins:", self.styles['DataHeader']))
                story.append(susp_table)
                story.append(Spacer(1, 10))

            print("Building PDF document")
            # Add footer to each page
            def add_page_number(canvas, doc):
                canvas.saveState()
                canvas.setFont('Helvetica', 9)
                page_num = canvas.getPageNumber()
                text = f"Page {page_num} | CONFIDENTIAL | Case Reference: IG-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
                canvas.drawString(doc.leftMargin, doc.bottomMargin - 20, text)
                canvas.restoreState()

            # Build PDF
            doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
            print(f"Successfully generated PDF report: {output_path}")
            
        except Exception as e:
            print(f"Error generating PDF report: {str(e)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            raise
        finally:
            try:
                shutil.rmtree(self.temp_dir)
                print("Cleaned up temporary files")
            except Exception as e:
                print(f"Error cleaning up temporary files: {str(e)}")

def main():
    try:
        report_generator = InstagramDataReport()
        username = input("Enter Instagram username to generate report for: ")
        output_dir = "reports"
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, f"instagram_report_{username}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf")
        report_generator.generate_report(username, output_path)
    except Exception as e:
        print(f"Error in main: {str(e)}")
    finally:
        if 'report_generator' in locals():
            report_generator.client.close()

if __name__ == "__main__":
    main()