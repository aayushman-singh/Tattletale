import os
import shutil
import tempfile
from datetime import datetime
from pymongo import MongoClient
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak, Table, TableStyle
from reportlab.lib.units import inch
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics

class DiscordDataReport:
    def __init__(self):
        self.MONGO_URI = "mongodb+srv://aayushman2702:Lmaoded%4011@cluster0.eivmu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
        self.DATABASE_NAME = "discordDB"
        self.COLLECTION_NAME = "discord_users"
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
        pdfmetrics.registerFont(TTFont('DejaVuSans', 'DejaVuSans.ttf'))
        self.styles.add(ParagraphStyle(
            name='CaseTitle', parent=self.styles['Heading1'], fontSize=28, spaceAfter=30, textColor=colors.black, alignment=1, fontName='Helvetica-Bold'))
        self.styles.add(ParagraphStyle(
            name='OfficialHeader', parent=self.styles['Heading2'], fontSize=16, spaceAfter=20, textColor=colors.black, borderWidth=2, borderColor=colors.black, borderPadding=15, backColor=colors.HexColor('#F5F5F5'), alignment=1, fontName='Helvetica-Bold'))
        self.styles.add(ParagraphStyle(
            name='SectionHeader', parent=self.styles['Heading2'], fontSize=14, spaceAfter=15, textColor=colors.black, borderWidth=1, borderColor=colors.black, borderPadding=8, backColor=colors.HexColor('#E8E8E8'), fontName='Helvetica-Bold'))
        self.styles.add(ParagraphStyle(
            name='DataHeader', parent=self.styles['Heading3'], fontSize=12, spaceAfter=10, textColor=colors.black, fontName='Helvetica-Bold'))
        self.styles.add(ParagraphStyle(
            name='Content', parent=self.styles['Normal'], fontSize=11, spaceAfter=8, textColor=colors.black, fontName='Helvetica'))
        self.styles.add(ParagraphStyle(
            name='EvidenceLabel', parent=self.styles['Normal'], fontSize=10, textColor=colors.HexColor('#666666'), fontName='Helvetica-Oblique'))
        self.styles.add(ParagraphStyle(
            name='ChatContent', parent=self.styles['Content'], fontName='DejaVuSans', fontSize=11, spaceAfter=8, textColor=colors.black))

    def download_file(self, url):
        import requests
        from urllib.parse import urlparse
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            }
            response = requests.get(url, headers=headers, stream=True)
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

    def process_chat_log(self, chat_log):
        # If chat_log is a URL, download and read it; otherwise, treat as text
        import requests
        if chat_log.startswith('http'):
            try:
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                }
                response = requests.get(chat_log, headers=headers)
                response.raise_for_status()
                content = response.text
            except Exception as e:
                print(f"Error downloading chat log from {chat_log}: {str(e)}")
                content = "[Could not download chat log]"
        else:
            content = chat_log
        # Split into lines and return as list
        return [line for line in content.split('\n') if line.strip()]

    def generate_report(self, username, output_path):
        try:
            user_data = self.collection.find_one({"username": username})
            if not user_data:
                raise ValueError(f"No data found for username: {username}")
            os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else '.', exist_ok=True)
            doc = SimpleDocTemplate(
                output_path, pagesize=A4, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
            story = []
            # --- Cover/Header Page ---
            story.append(Paragraph("CONFIDENTIAL", self.styles['CaseTitle']))
            story.append(Spacer(1, 30))
            story.append(Paragraph("Digital Evidence Report", self.styles['OfficialHeader']))
            story.append(Spacer(1, 20))
            story.append(Paragraph("Discord Account Investigation", self.styles['OfficialHeader']))
            story.append(Spacer(1, 40))
            # --- Subject Information ---
            story.append(Paragraph("CASE DETAILS", self.styles['SectionHeader']))
            story.append(Paragraph(f"Subject Username: {username}", self.styles['DataHeader']))
            if 'createdAt' in user_data:
                story.append(Paragraph(f"Account Created: {user_data['createdAt']}", self.styles['Content']))
            if 'updatedAt' in user_data:
                story.append(Paragraph(f"Last Updated: {user_data['updatedAt']}", self.styles['Content']))
            story.append(Paragraph(f"Report Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", self.styles['Content']))
            story.append(Paragraph(f"Report Reference: DC-{datetime.now().strftime('%Y%m%d-%H%M%S')}", self.styles['Content']))
            story.append(Spacer(1, 20))
            # --- Summary Section ---
            chats = user_data.get('chats', [])
            total_chats = len(chats)
            total_screenshots = sum(len(chat.get('screenshots', [])) for chat in chats)
            story.append(Paragraph("SUMMARY", self.styles['SectionHeader']))
            summary_data = [
                ["Total Chats", str(total_chats)],
                ["Total Screenshots", str(total_screenshots)]
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
            index_data = [["#", "Chat With", "#Screenshots"]]
            for idx, chat in enumerate(chats, 1):
                index_data.append([
                    str(idx),
                    chat.get('receiverUsername', 'Unknown'),
                    str(len(chat.get('screenshots', [])))
                ])
            index_table = Table(index_data, colWidths=[0.5*inch, 3*inch, 1.5*inch])
            index_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ]))
            story.append(index_table)
            story.append(PageBreak())
            # --- Chats Section ---
            story.append(Paragraph("CHATS", self.styles['SectionHeader']))
            for idx, chat in enumerate(chats, 1):
                chat_block = []
                chat_block.append(Paragraph(f"<b>Chat with:</b> {chat.get('receiverUsername', 'Unknown')}", self.styles['DataHeader']))
                # Chat log (as text or file)
                chat_log = chat.get('chats', '')
                if chat_log:
                    chat_block.append(Paragraph("<b>Message Log:</b>", self.styles['Content']))
                    for line in self.process_chat_log(chat_log):
                        chat_block.append(Paragraph(line, self.styles['ChatContent']))
                # Screenshots
                screenshots = chat.get('screenshots', [])
                if screenshots:
                    chat_block.append(Paragraph("<b>Screenshots:</b>", self.styles['Content']))
                    for screen_idx, screenshot_url in enumerate(screenshots, 1):
                        local_path = self.download_file(screenshot_url)
                        if local_path and local_path.endswith(('.jpg', '.jpeg', '.png')):
                            img = Image(local_path, width=6*inch, height=4*inch)
                            chat_block.append(img)
                            chat_block.append(Paragraph(
                                f"Evidence ID: CHAT-SCRN-{datetime.now().strftime('%Y%m%d')}-{idx}-{screen_idx}",
                                self.styles['EvidenceLabel']
                            ))
                            chat_block.append(Spacer(1, 10))
                chat_table = Table([[b] for b in chat_block], colWidths=[6.5*inch])
                chat_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F0F8FF')),
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
                text = f"Page {page_num} | CONFIDENTIAL | Case Reference: DC-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
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
        report_generator = DiscordDataReport()
        username = input("Enter username to generate report for: ")
        output_dir = "reports"
        output_path = os.path.join(output_dir, f"discord_report_{username}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf")
        report_generator.generate_report(username, output_path)
    except Exception as e:
        print(f"Error in main: {str(e)}")
    finally:
        if 'report_generator' in locals():
            report_generator.client.close()

if __name__ == "__main__":
    main() 