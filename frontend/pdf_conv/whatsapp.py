from pymongo import MongoClient
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.lib.units import inch
from datetime import datetime
import os
import requests
import tempfile
import shutil
from urllib.parse import urlparse
import time
from reportlab.platypus import Table, TableStyle

class WhatsAppDataReport:
    def __init__(self):
        # MongoDB Configuration
        self.MONGO_URI = "mongodb+srv://aayushman2702:Lmaoded%4011@cluster0.eivmu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
        self.DATABASE_NAME = "whatsappDB"
        self.COLLECTION_NAME = "whatsapp_users"

        try:
            self.client = MongoClient(self.MONGO_URI)
            self.db = self.client[self.DATABASE_NAME]
            self.collection = self.db[self.COLLECTION_NAME]
            self.temp_dir = tempfile.mkdtemp()
            self.client.server_info()
            print(f"Successfully connected to MongoDB database: {self.DATABASE_NAME}")
        except Exception as e:
            print(f"Error connecting to MongoDB: {str(e)}")
            raise
        
        self.styles = getSampleStyleSheet()
        self._init_styles()

    def _init_styles(self):
        """Initialize custom styles for the PDF."""
        # Title Style
        self.styles.add(ParagraphStyle(
            name='CaseTitle',
            parent=self.styles['Heading1'],
            fontSize=28,
            spaceAfter=30,
            textColor=colors.HexColor('#000000'),
            alignment=1,
            fontName='Helvetica-Bold'
        ))
        
        # Official Header Style
        self.styles.add(ParagraphStyle(
            name='OfficialHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            spaceAfter=20,
            textColor=colors.HexColor('#000000'),
            borderWidth=2,
            borderColor=colors.HexColor('#000000'),
            borderPadding=15,
            backColor=colors.HexColor('#F5F5F5'),
            alignment=1,
            fontName='Helvetica-Bold'
        ))
        
        # Section Headers
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
        
        # Data Headers
        self.styles.add(ParagraphStyle(
            name='DataHeader',
            parent=self.styles['Heading3'],
            fontSize=12,
            spaceAfter=10,
            textColor=colors.HexColor('#000000'),
            fontName='Helvetica-Bold'
        ))
        
        # Content Style
        self.styles.add(ParagraphStyle(
            name='Content',
            parent=self.styles['Normal'],
            fontSize=11,
            spaceAfter=8,
            textColor=colors.HexColor('#000000'),
            fontName='Helvetica'
        ))
        
        # Chat Content Style
        self.styles.add(ParagraphStyle(
            name='ChatContent',
            parent=self.styles['Content'],
            fontSize=11,
            spaceAfter=8,
            textColor=colors.HexColor('#000000'),
            fontName='Helvetica',
            allowWidows=0,
            allowOrphans=0
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
                filename = f"file_{int(time.time())}"
            
            content_type = response.headers.get('content-type', '')
            if 'image' in content_type or url.endswith(('.png', '.jpg', '.jpeg')):
                if not filename.endswith(('.jpg', '.png', '.jpeg')):
                    filename += '.png'
            elif 'text' in content_type or url.endswith('.txt'):
                if not filename.endswith('.txt'):
                    filename += '.txt'
            
            local_path = os.path.join(self.temp_dir, filename)
            
            with open(local_path, 'wb') as f:
                shutil.copyfileobj(response.raw, f)
            
            return local_path
        except Exception as e:
            print(f"Error downloading file from {url}: {str(e)}")
            return None

    def process_chat_log(self, file_path):
        """Process and read content from a chat log file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
                # Split content into lines and process
                lines = content.split('\n')
                processed_lines = []
                
                for line in lines:
                    line = line.strip()
                    if line:  # Skip empty lines
                        # Make message numbers bold using reportlab markup
                        # Check if line starts with "Message" followed by a number
                        if line.lower().startswith('message'):
                            # Find the position of the first colon
                            colon_pos = line.find(':')
                            if colon_pos != -1:
                                # Make the "Message X" part bold
                                message_header = line[:colon_pos]
                                message_content = line[colon_pos:]
                                formatted_line = f'<b>{message_header}</b>{message_content}'
                                processed_lines.append(formatted_line)
                            else:
                                processed_lines.append(line)
                        else:
                            processed_lines.append(line)
                        processed_lines.append('')  # Add empty line after each message
                
                # Join lines back together
                processed_content = '\n'.join(processed_lines)
                
                # Limit content length for PDF
                if len(processed_content) > 2000:
                    truncate_point = processed_content[:2000].rfind('\n\n')
                    if truncate_point == -1:
                        truncate_point = 2000
                    processed_content = processed_content[:truncate_point] + "\n\n[Content truncated...]"
                
                return processed_content
        except Exception as e:
            print(f"Error reading chat log {file_path}: {str(e)}")
            return "Error reading chat content"
        
    def format_screenshots_section(self, chats):
        """Format screenshots section for the report."""
        story = []
        story.append(Paragraph("VISUAL EVIDENCE", self.styles['SectionHeader']))
        story.append(Spacer(1, 20))

        for chat_idx, chat in enumerate(chats, 1):
            if chat.get('screenshots'):
                story.append(Paragraph(f"Communication #{chat_idx} - Participant: {chat['receiverUsername']}", self.styles['DataHeader']))
                story.append(Spacer(1, 10))
                
                for screen_idx, screenshot_url in enumerate(chat['screenshots'], 1):
                    local_path = self.download_file(screenshot_url)
                    if local_path and local_path.endswith(('.jpg', '.jpeg', '.png')):
                        img = Image(local_path, width=6*inch, height=4*inch)
                        story.append(img)
                        story.append(Paragraph(
                            f"Evidence ID: SCRN-{datetime.now().strftime('%Y%m%d')}-{chat_idx}-{screen_idx}",
                            self.styles['EvidenceLabel']
                        ))
                        story.append(Spacer(1, 20))
                
                story.append(PageBreak())

        return story    

    def format_chat_section(self, chats):
        """Format chats section for the report."""
        story = []
        story.append(Paragraph("COMMUNICATION RECORDS", self.styles['SectionHeader']))
        story.append(Spacer(1, 20))

        for idx, chat in enumerate(chats, 1):
            # Chat Header
            story.append(Paragraph(f"Communication #{idx}", self.styles['DataHeader']))
            story.append(Paragraph(f"Participant: {chat['receiverUsername']}", self.styles['Content']))
            story.append(Spacer(1, 10))

            # Chat Log
            if 'chats' in chat and chat['chats'].startswith('http'):
                local_path = self.download_file(chat['chats'])
                if local_path:
                    content = self.process_chat_log(local_path)
                    story.append(Paragraph("Message Log:", self.styles['Content']))
                    # Split content into paragraphs and create separate Paragraph objects
                    for line in content.split('\n'):
                        if line.strip():  # Only add non-empty lines
                            story.append(Paragraph(line, self.styles['ChatContent']))
                    story.append(Paragraph(
                        f"Evidence ID: CHAT-{datetime.now().strftime('%Y%m%d')}-{idx}",
                        self.styles['EvidenceLabel']
                    ))

            # Screenshots
            if chat.get('screenshots'):
                story.append(Paragraph("Visual Evidence:", self.styles['Content']))
                for screen_idx, screenshot_url in enumerate(chat['screenshots'], 1):
                    local_path = self.download_file(screenshot_url)
                    if local_path and local_path.endswith(('.jpg', '.jpeg', '.png')):
                        img = Image(local_path, width=6*inch, height=4*inch)
                        story.append(img)
                        story.append(Paragraph(
                            f"Evidence ID: SCRN-{datetime.now().strftime('%Y%m%d')}-{idx}-{screen_idx}",
                            self.styles['EvidenceLabel']
                        ))
                        story.append(Spacer(1, 10))

            story.append(PageBreak())

        return story

    def get_url_and_label(self, item):
        """Return (url, label) for a media/files/link item, robust to string or dict."""
        if isinstance(item, dict):
            url = item.get('url', '')
            label = item.get('filename', url)
        else:
            url = str(item)
            label = url
        return url, label

    def generate_report(self, username, output_path):
        """Generate the complete report."""
        try:
            user_data = self.collection.find_one({"username": username})
            if not user_data:
                raise ValueError(f"No data found for username: {username}")

            os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else '.', exist_ok=True)

            doc = SimpleDocTemplate(
                output_path,
                pagesize=A4,
                rightMargin=50,
                leftMargin=50,
                topMargin=50,
                bottomMargin=50
            )

            story = []

            # --- Cover/Header Page ---
            story.append(Paragraph("CONFIDENTIAL", self.styles['CaseTitle']))
            story.append(Spacer(1, 30))
            story.append(Paragraph("Digital Evidence Report", self.styles['OfficialHeader']))
            story.append(Spacer(1, 20))
            story.append(Paragraph("WhatsApp Account Investigation", self.styles['OfficialHeader']))
            story.append(Spacer(1, 40))

            # --- Subject Information ---
            story.append(Paragraph("CASE DETAILS", self.styles['SectionHeader']))
            story.append(Paragraph(f"Subject Username: {username}", self.styles['DataHeader']))
            last_updated = user_data.get('lastUpdated')
            if last_updated:
                story.append(Paragraph(f"Last Updated: {last_updated}", self.styles['Content']))
            story.append(Paragraph(f"Report Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", self.styles['Content']))
            story.append(Paragraph(f"Report Reference: WA-{datetime.now().strftime('%Y%m%d-%H%M%S')}", self.styles['Content']))
            story.append(Spacer(1, 20))

            # --- Summary Section ---
            chats = user_data.get('chats', [])
            total_chats = len(chats)
            total_messages = sum(len(chat.get('messages', [])) for chat in chats)
            total_screenshots = sum(len(chat.get('screenshots', [])) for chat in chats)
            media = user_data.get('media', {})
            files = user_data.get('files', {})
            total_media = len(media.get('media', []))
            total_docs = len(media.get('docs', []))
            total_links = len(media.get('links', []))
            total_files_media = len(files.get('media', []))
            total_files_docs = len(files.get('docs', []))
            total_files_links = len(files.get('links', []))
            story.append(Paragraph("SUMMARY", self.styles['SectionHeader']))
            summary_data = [
                ["Total Chats", str(total_chats)],
                ["Total Messages", str(total_messages)],
                ["Total Screenshots", str(total_screenshots)],
                ["Media Files (media)", str(total_media)],
                ["Documents (media)", str(total_docs)],
                ["Links (media)", str(total_links)],
                ["Media Files (files)", str(total_files_media)],
                ["Documents (files)", str(total_files_docs)],
                ["Links (files)", str(total_files_links)],
            ]
            summary_table = Table(summary_data, colWidths=[2.5*inch, 2*inch])
            summary_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 11),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ]))
            story.append(summary_table)
            story.append(Spacer(1, 20))

            # --- Evidence Index ---
            story.append(Paragraph("EVIDENCE INDEX", self.styles['SectionHeader']))
            index_data = [["#", "Chat With", "#Messages", "#Screenshots"]]
            for idx, chat in enumerate(chats, 1):
                index_data.append([
                    str(idx),
                    chat.get('receiverUsername', 'Unknown'),
                    str(len(chat.get('messages', []))),
                    str(len(chat.get('screenshots', [])))
                ])
            index_table = Table(index_data, colWidths=[0.5*inch, 2.5*inch, 1*inch, 1*inch])
            index_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ]))
            story.append(index_table)
            story.append(PageBreak())

            # --- Media/Files Section ---
            story.append(Paragraph("MEDIA & FILES", self.styles['SectionHeader']))
            def add_media_list(title, items):
                if items:
                    story.append(Paragraph(title, self.styles['DataHeader']))
                    for i, item in enumerate(items, 1):
                        url, label = self.get_url_and_label(item)
                        if url:
                            story.append(Paragraph(
                                f"• <link href='{url}'><font color='blue'><u>{label}</u></font></link>",
                                self.styles['Content']
                            ))
            add_media_list("Media Files (media)", media.get('media', []))
            add_media_list("Documents (media)", media.get('docs', []))
            add_media_list("Links (media)", media.get('links', []))
            add_media_list("Media Files (files)", files.get('media', []))
            add_media_list("Documents (files)", files.get('docs', []))
            add_media_list("Links (files)", files.get('links', []))
            story.append(PageBreak())

            # --- Chats Section ---
            story.append(Paragraph("COMMUNICATION RECORDS", self.styles['SectionHeader']))
            story.append(Spacer(1, 20))
            for idx, chat in enumerate(chats, 1):
                from reportlab.lib.colors import HexColor
                chat_block_bg = HexColor('#F0F8FF')
                chat_block = []
                chat_block.append(Paragraph(f"<b>Communication with:</b> {chat.get('receiverUsername', 'Unknown')}", self.styles['DataHeader']))
                # Messages as Paragraphs (not a table)
                messages = chat.get('messages', [])
                if messages:
                    chat_block.append(Paragraph("<b>Messages:</b>", self.styles['Content']))
                    for msg in messages:
                        msg_text = f"<b>{msg.get('type', '')}</b>: {msg.get('message', '')}"
                        if msg.get('timestamp'):
                            msg_text += f" <font size=8 color='grey'>[{msg['timestamp']}]</font>"
                        if msg.get('chatLogURL'):
                            msg_text += f" <link href='{msg['chatLogURL']}'><font color='blue'><u>[Log]</u></font></link>"
                        chat_block.append(Paragraph(msg_text, self.styles['ChatContent']))
                # Screenshots
                screenshots = chat.get('screenshots', [])
                if screenshots:
                    chat_block.append(Paragraph("<b>Visual Evidence:</b>", self.styles['Content']))
                    for screen_idx, screenshot_url in enumerate(screenshots, 1):
                        local_path = self.download_file(screenshot_url)
                        if local_path and local_path.endswith(('.jpg', '.jpeg', '.png')):
                            img = Image(local_path, width=6*inch, height=4*inch)
                            chat_block.append(img)
                            chat_block.append(Paragraph(
                                f"Evidence ID: SCRN-{datetime.now().strftime('%Y%m%d')}-{idx}-{screen_idx}",
                                self.styles['EvidenceLabel']
                            ))
                            chat_block.append(Spacer(1, 10))
                # Render chat block with background
                chat_table = Table([[b] for b in chat_block], colWidths=[6.5*inch])
                chat_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, -1), chat_block_bg),
                    ('BOX', (0, 0), (-1, -1), 1, colors.lightblue),
                    ('LEFTPADDING', (0, 0), (-1, -1), 10),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                    ('TOPPADDING', (0, 0), (-1, -1), 8),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ]))
                story.append(chat_table)
                story.append(Spacer(1, 20))
            # Add footer to each page
            def add_page_number(canvas, doc):
                canvas.saveState()
                canvas.setFont('Helvetica', 9)
                page_num = canvas.getPageNumber()
                text = f"Page {page_num} | CONFIDENTIAL | Case Reference: WA-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
                canvas.drawString(doc.leftMargin, doc.bottomMargin - 20, text)
                canvas.restoreState()

            doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
            print(f"Report generated successfully: {output_path}")

        except Exception as e:
            print(f"Error generating report: {str(e)}")
            raise
        finally:
            try:
                shutil.rmtree(self.temp_dir)
            except Exception as e:
                print(f"Error cleaning up temporary files: {str(e)}")

def main():
    try:
        report_generator = WhatsAppDataReport()
        username = input("Enter username to generate report for: ")
        output_dir = "reports"
        output_path = os.path.join(output_dir, f"whatsapp_report_{username}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf")
        report_generator.generate_report(username, output_path)
    except Exception as e:
        print(f"Error in main: {str(e)}")
    finally:
        if 'report_generator' in locals():
            report_generator.client.close()

if __name__ == "__main__":
    main()