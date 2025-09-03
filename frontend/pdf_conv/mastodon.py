import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pymongo import MongoClient
import sys
import requests

class MastodonDataReport:
    def __init__(self):
        self.client = MongoClient('mongodb+srv://aayushman2702:Lmaoded%4011@cluster0.eivmu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
        self.db = self.client['mastodonDB']
        self.collection = self.db['mastodon_users']
        font_path = os.path.join(os.path.dirname(__file__), 'fonts', 'DejaVuSans.ttf')
        pdfmetrics.registerFont(TTFont('DejaVuSans', font_path))
        self.styles = getSampleStyleSheet()
        # Professional style initialization
        self.styles.add(ParagraphStyle(name='CaseTitle', parent=self.styles['Heading1'], fontSize=28, spaceAfter=30, textColor=colors.black, alignment=1, fontName='DejaVuSans'))
        self.styles.add(ParagraphStyle(name='OfficialHeader', parent=self.styles['Heading2'], fontSize=16, spaceAfter=20, textColor=colors.black, borderWidth=2, borderColor=colors.black, borderPadding=15, backColor=colors.HexColor('#F5F5F5'), alignment=1, fontName='DejaVuSans'))
        self.styles.add(ParagraphStyle(name='SectionHeader', parent=self.styles['Heading2'], fontSize=14, spaceAfter=15, textColor=colors.black, borderWidth=1, borderColor=colors.black, borderPadding=8, backColor=colors.HexColor('#E8E8E8'), fontName='DejaVuSans'))
        self.styles.add(ParagraphStyle(name='DataHeader', parent=self.styles['Heading3'], fontSize=12, spaceAfter=10, textColor=colors.black, fontName='DejaVuSans'))
        self.styles.add(ParagraphStyle(name='Content', parent=self.styles['Normal'], fontSize=11, spaceAfter=8, textColor=colors.black, fontName='DejaVuSans'))
        self.styles.add(ParagraphStyle(name='EvidenceLabel', parent=self.styles['Normal'], fontSize=10, textColor=colors.HexColor('#666666'), fontName='DejaVuSans'))

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
            story.append(Paragraph("Mastodon Account Investigation", self.styles['OfficialHeader']))
            story.append(Spacer(1, 40))
            story.append(PageBreak())
            # --- Case Details ---
            story.append(Paragraph("CASE DETAILS", self.styles['SectionHeader']))
            story.append(Paragraph(f"Username: {user_data.get('username', '')}", self.styles['DataHeader']))
            story.append(Paragraph(f"Full Name: {user_data.get('fullName', '')}", self.styles['DataHeader']))
            story.append(Paragraph(f"Mastodon Handle: {user_data.get('name', '')}", self.styles['DataHeader']))
            story.append(Paragraph(f"Server: {user_data.get('server', '')}", self.styles['DataHeader']))
            story.append(Paragraph(f"User ID: {user_data.get('userId', '')}", self.styles['DataHeader']))
            if 'lastUpdated' in user_data:
                story.append(Paragraph(f"Last Updated: {user_data['lastUpdated']}", self.styles['Content']))
            story.append(Paragraph(f"Report Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", self.styles['Content']))
            story.append(Paragraph(f"Report Reference: MS-{datetime.now().strftime('%Y%m%d-%H%M%S')}", self.styles['Content']))
            story.append(Spacer(1, 20))
            story.append(PageBreak())
            # --- Evidence Index ---
            story.append(Paragraph("EVIDENCE INDEX", self.styles['SectionHeader']))
            evidence_data = [["#", "Type", "Description"]]
            idx = 1
            if user_data.get('profile_pic'):
                evidence_data.append([str(idx), "Profile Picture", "Subject's Mastodon profile image"])
                idx += 1
            if user_data.get('profile'):
                evidence_data.append([str(idx), "Profile Link", "Link to Mastodon profile"])
                idx += 1
            for label in ["feed", "feed_1", "feed_2", "feed_3"]:
                if user_data.get(label):
                    evidence_data.append([str(idx), label.replace('_', ' ').title(), f"Feed link: {user_data.get(label)[:40]}..."])
                    idx += 1
            if user_data.get('logs'):
                evidence_data.append([str(idx), "Logs", "Link to logs file"])
                idx += 1
            evidence_table = Table(evidence_data, colWidths=[0.5*inch, 1.5*inch, 4.5*inch])
            evidence_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('FONTNAME', (0, 0), (-1, -1), 'DejaVuSans'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ]))
            story.append(evidence_table)
            story.append(Spacer(1, 20))
            story.append(PageBreak())
            # --- Profile Section ---
            story.append(Paragraph("PROFILE", self.styles['SectionHeader']))
            if user_data.get('profile_pic'):
                img_url = user_data['profile_pic']
                img_path = os.path.join(os.path.dirname(__file__), 'temp_profile_pic.jpg')
                try:
                    resp = requests.get(img_url, timeout=10)
                    if resp.status_code == 200 and resp.headers.get('content-type', '').startswith('image'):
                        with open(img_path, 'wb') as f:
                            f.write(resp.content)
                        try:
                            img = Image(img_path, width=1.5*inch, height=1.5*inch)
                            story.append(img)
                            story.append(Paragraph(f"Evidence ID: PROFILE-{datetime.now().strftime('%Y%m%d')}-01", self.styles['EvidenceLabel']))
                        except Exception:
                            story.append(Paragraph("Image could not be retrieved due to access restrictions.", self.styles['EvidenceLabel']))
                        finally:
                            if os.path.exists(img_path):
                                try:
                                    os.remove(img_path)
                                except Exception:
                                    pass
                except Exception:
                    if os.path.exists(img_path):
                        try:
                            os.remove(img_path)
                        except Exception:
                            pass
            profile_url = user_data.get('profile', '')
            if profile_url:
                story.append(Paragraph(f"<link href='{profile_url}' color='blue'><u>View Profile</u></link>", self.styles['Content']))
            story.append(Spacer(1, 20))
            story.append(PageBreak())
            # --- Summary Section ---
            story.append(Paragraph("FEEDS", self.styles['SectionHeader']))
            feeds = [
                ("Feed", user_data.get('feed', '')),
                ("Feed 1", user_data.get('feed_1', '')),
                ("Feed 2", user_data.get('feed_2', '')),
                ("Feed 3", user_data.get('feed_3', '')),
            ]
            feed_table_data = [["Type", "Link"]]
            for label, url in feeds:
                if url:
                    feed_table_data.append([
                        label,
                        Paragraph(f"<link href='{url}' color='blue'><u>{url}</u></link>", self.styles['Content'])
                    ])
            feed_table = Table(feed_table_data, colWidths=[1.2*inch, 5*inch])
            feed_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('FONTNAME', (0, 0), (-1, -1), 'DejaVuSans'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ]))
            story.append(feed_table)
            story.append(Spacer(1, 20))
            story.append(PageBreak())
            # --- Logs Section ---
            story.append(Paragraph("LOGS", self.styles['SectionHeader']))
            logs_url = user_data.get('logs', '')
            if logs_url:
                story.append(Paragraph(f"<link href='{logs_url}' color='blue'><u>View Logs</u></link>", self.styles['Content']))
            story.append(Spacer(1, 20))
            # Add footer to each page
            def add_page_number(canvas, doc):
                canvas.saveState()
                canvas.setFont('Helvetica', 9)
                page_num = canvas.getPageNumber()
                text = f"Page {page_num} | CONFIDENTIAL | Case Reference: MS-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
                canvas.drawString(doc.leftMargin, doc.bottomMargin - 20, text)
                canvas.restoreState()
            doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
            print(f"Report generated successfully: {output_path}")
        except Exception as e:
            print(f"Error generating report: {str(e)}")
            raise
        finally:
            self.client.close()

def main():
    try:
        report_generator = MastodonDataReport()
        username = input("Enter Mastodon username to generate report for: ")
        output_dir = "reports"
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, f"mastodon_report_{username}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf")
        report_generator.generate_report(username, output_path)
    except Exception as e:
        print(f"Error in main: {str(e)}")
    finally:
        if 'report_generator' in locals():
            report_generator.client.close()

if __name__ == '__main__':
    main() 