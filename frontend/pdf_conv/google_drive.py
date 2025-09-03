import os
import shutil
import tempfile
from datetime import datetime
from pymongo import MongoClient
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib.units import inch
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics

class GoogleDriveDataReport:
    def __init__(self):
        self.MONGO_URI = "mongodb+srv://aayushman2702:Lmaoded%4011@cluster0.eivmu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
        self.DATABASE_NAME = "driveDB"
        self.COLLECTION_NAME = "drive_users"
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

    def format_size(self, size_str):
        try:
            size = int(size_str)
            if size < 1024:
                return f"{size} B"
            elif size < 1024*1024:
                return f"{size/1024:.1f} KB"
            elif size < 1024*1024*1024:
                return f"{size/1024/1024:.1f} MB"
            else:
                return f"{size/1024/1024/1024:.1f} GB"
        except Exception:
            return size_str

    def format_created_time(self, dt_str):
        try:
            return datetime.fromisoformat(dt_str.replace('Z', '')).strftime('%Y-%m-%d %H:%M')
        except Exception:
            return dt_str[:16]

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
            story.append(Paragraph("Google Drive Account Investigation", self.styles['OfficialHeader']))
            story.append(Spacer(1, 40))
            # --- Subject Information ---
            story.append(Paragraph("CASE DETAILS", self.styles['SectionHeader']))
            story.append(Paragraph(f"Subject Email: {email}", self.styles['DataHeader']))
            if 'createdAt' in user_data:
                story.append(Paragraph(f"Account Created: {user_data['createdAt']}", self.styles['Content']))
            if 'updatedAt' in user_data:
                story.append(Paragraph(f"Last Updated: {user_data['updatedAt']}", self.styles['Content']))
            story.append(Paragraph(f"Report Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", self.styles['Content']))
            story.append(Paragraph(f"Report Reference: GD-{datetime.now().strftime('%Y%m%d-%H%M%S')}", self.styles['Content']))
            story.append(Spacer(1, 20))
            # --- Summary Section ---
            drive_files = user_data.get('driveFiles', [])
            total_files = len(drive_files)
            total_size = sum(int(f.get('size', '0')) for f in drive_files if f.get('size', '0').isdigit())
            story.append(Paragraph("SUMMARY", self.styles['SectionHeader']))
            summary_data = [
                ["Total Files", str(total_files)],
                ["Total Size", self.format_size(str(total_size))],
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
            index_data = [["#", "Name", "Type", "Created", "Size"]]
            for idx, f in enumerate(drive_files, 1):
                index_data.append([
                    str(idx),
                    Paragraph(f.get('name', ''), self.styles['Content']),
                    Paragraph( f.get('mimeType', ''), self.styles['Content']),
                    Paragraph(self.format_created_time(f.get('createdTime', '')), self.styles['Content']),
                    self.format_size(f.get('size', ''))
                ])
            index_table = Table(index_data, colWidths=[0.5*inch, 2.2*inch, 1.5*inch, 2.2*inch, 1*inch])
            index_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightblue),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('WORDWRAP', (0, 0), (-1, -1), 'CJK'),
            ]))
            story.append(index_table)
            story.append(PageBreak())
            # --- Files Section ---
            story.append(Paragraph("FILES", self.styles['SectionHeader']))
            for idx, f in enumerate(drive_files, 1):
                file_block = []
                file_block.append(Paragraph(f"<b>File {idx}:</b> {f.get('name', '')}", self.styles['DataHeader']))
                file_block.append(Paragraph(f"<b>Type:</b> {f.get('mimeType', '')}", self.styles['Content']))
                file_block.append(Paragraph(f"<b>Created:</b> {f.get('createdTime', '')}", self.styles['Content']))
                file_block.append(Paragraph(f"<b>Size:</b> {self.format_size(f.get('size', ''))}", self.styles['Content']))
                file_block.append(Paragraph(f"<b>ID:</b> {f.get('id', '')}", self.styles['Content']))
                url = f.get('webViewLink', '')
                if url:
                    file_block.append(Paragraph(f"<link href='{url}'><font color='blue'><u>Open in Google Drive</u></font></link>", self.styles['Content']))
                file_table = Table([[b] for b in file_block], colWidths=[6.5*inch])
                file_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, -1), colors.whitesmoke),
                    ('BOX', (0, 0), (-1, -1), 1, colors.lightblue),
                    ('LEFTPADDING', (0, 0), (-1, -1), 10),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                    ('TOPPADDING', (0, 0), (-1, -1), 8),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ]))
                story.append(file_table)
                story.append(Spacer(1, 10))
            # Add footer to each page
            def add_page_number(canvas, doc):
                canvas.saveState()
                canvas.setFont('Helvetica', 9)
                page_num = canvas.getPageNumber()
                text = f"Page {page_num} | CONFIDENTIAL | Case Reference: GD-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
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
        report_generator = GoogleDriveDataReport()
        email = input("Enter email to generate report for: ")
        output_dir = "reports"
        output_path = os.path.join(output_dir, f"gdrive_report_{email}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf")
        report_generator.generate_report(email, output_path)
    except Exception as e:
        print(f"Error in main: {str(e)}")
    finally:
        if 'report_generator' in locals():
            report_generator.client.close()

if __name__ == "__main__":
    main() 