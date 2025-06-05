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

class YoutubeDataReport:
    def __init__(self):
        self.MONGO_URI = "mongodb+srv://aayushman2702:Lmaoded%4011@cluster0.eivmu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
        self.DATABASE_NAME = "youtubeDB"
        self.COLLECTION_NAME = "youtube_users"
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
            name='LogContent', parent=self.styles['Content'], fontName='DejaVuSans', fontSize=11, spaceAfter=8, textColor=colors.black))

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

    def get_youtube_thumbnail(self, url):
        # Extract video ID from YouTube URL and return thumbnail URL
        import re
        patterns = [
            r"youtu\.be/([\w-]+)",
            r"youtube\.com/watch\?v=([\w-]+)",
            r"youtube\.com/embed/([\w-]+)",
            r"youtube\.com/v/([\w-]+)"
        ]
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                video_id = match.group(1)
                return f"https://img.youtube.com/vi/{video_id}/0.jpg"
        return None

    def generate_report(self, email, output_path):
        try:
            user_data = self.collection.find_one({"email": email})
            if not user_data:
                raise ValueError(f"No data found for email: {email}")
            os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else '.', exist_ok=True)
            doc = SimpleDocTemplate(
                output_path, pagesize=A4, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
            story = []
            # --- Cover/Header Page ---
            story.append(Paragraph("CONFIDENTIAL", self.styles['CaseTitle']))
            story.append(Spacer(1, 30))
            story.append(Paragraph("Digital Evidence Report", self.styles['OfficialHeader']))
            story.append(Spacer(1, 20))
            story.append(Paragraph("YouTube Account Investigation", self.styles['OfficialHeader']))
            story.append(Spacer(1, 40))
            # --- Subject Information ---
            story.append(Paragraph("CASE DETAILS", self.styles['SectionHeader']))
            story.append(Paragraph(f"Subject Email: {email}", self.styles['DataHeader']))
            if 'createdAt' in user_data:
                story.append(Paragraph(f"Account Created: {user_data['createdAt']}", self.styles['Content']))
            if 'updatedAt' in user_data:
                story.append(Paragraph(f"Last Updated: {user_data['updatedAt']}", self.styles['Content']))
            story.append(Paragraph(f"Report Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", self.styles['Content']))
            story.append(Paragraph(f"Report Reference: YT-{datetime.now().strftime('%Y%m%d-%H%M%S')}", self.styles['Content']))
            story.append(Spacer(1, 20))
            # --- Summary Section ---
            logs = user_data.get('logs', [])
            story.append(Paragraph("SUMMARY", self.styles['SectionHeader']))
            summary_data = [
                ["Total Logs", str(len(logs))],
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
            index_data = [["#", "Log URL"]]
            for idx, log in enumerate(logs, 1):
                url = log.get('url', '') if isinstance(log, dict) else str(log)
                index_data.append([str(idx), url])
            index_table = Table(index_data, colWidths=[0.5*inch, 5.5*inch])
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
            # --- Logs Section ---
            story.append(Paragraph("LOGS", self.styles['SectionHeader']))
            for idx, log in enumerate(logs, 1):
                log_block = []
                log_block.append(Paragraph(f"<b>Log {idx}:</b>", self.styles['DataHeader']))
                url = log.get('url', '') if isinstance(log, dict) else str(log)
                log_block.append(Paragraph(f"<link href='{url}'><font color='blue'><u>{url}</u></font></link>", self.styles['LogContent']))
                # Add YouTube thumbnail if possible
                thumb_url = self.get_youtube_thumbnail(url)
                if thumb_url:
                    local_path = self.download_file(thumb_url)
                    if local_path and local_path.endswith(('.jpg', '.jpeg', '.png')):
                        img = Image(local_path, width=3*inch, height=2*inch)
                        log_block.append(img)
                log_table = Table([[b] for b in log_block], colWidths=[6.5*inch])
                log_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, -1), colors.whitesmoke),
                    ('BOX', (0, 0), (-1, -1), 1, colors.lightblue),
                    ('LEFTPADDING', (0, 0), (-1, -1), 10),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                    ('TOPPADDING', (0, 0), (-1, -1), 8),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ]))
                story.append(log_table)
                story.append(Spacer(1, 10))
            # Add footer to each page
            def add_page_number(canvas, doc):
                canvas.saveState()
                canvas.setFont('Helvetica', 9)
                page_num = canvas.getPageNumber()
                text = f"Page {page_num} | CONFIDENTIAL | Case Reference: YT-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
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
        report_generator = YoutubeDataReport()
        email = input("Enter email to generate report for: ")
        output_dir = "reports"
        output_path = os.path.join(output_dir, f"youtube_report_{email}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf")
        report_generator.generate_report(email, output_path)
    except Exception as e:
        print(f"Error in main: {str(e)}")
    finally:
        if 'report_generator' in locals():
            report_generator.client.close()

if __name__ == "__main__":
    main() 