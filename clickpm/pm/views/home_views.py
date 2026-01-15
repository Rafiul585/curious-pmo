from django.http import HttpResponse
from django.views import View


class HomeView(View):
    """Simple home page for ClickPM API"""
    
    def get(self, request):
        html = """
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>ClickADN - A Project Management System</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #333;
                }
                .container {
                    background: white;
                    border-radius: 20px;
                    padding: 60px 80px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    max-width: 800px;
                    text-align: center;
                }
                h1 {
                    font-size: 3em;
                    margin-bottom: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                .subtitle {
                    font-size: 1.3em;
                    color: #666;
                    margin-bottom: 40px;
                }
                .status {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    background: #d4edda;
                    color: #155724;
                    padding: 12px 24px;
                    border-radius: 50px;
                    font-weight: 600;
                    margin-bottom: 40px;
                }
                .status::before {
                    content: "●";
                    font-size: 1.5em;
                    color: #28a745;
                }
                .links {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-top: 40px;
                }
                .link-card {
                    background: #f8f9fa;
                    padding: 30px;
                    border-radius: 15px;
                    text-decoration: none;
                    color: #333;
                    transition: all 0.3s ease;
                    border: 2px solid transparent;
                }
                .link-card:hover {
                    transform: translateY(-5px);
                    border-color: #667eea;
                    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.2);
                }
                .link-card h3 {
                    font-size: 1.3em;
                    margin-bottom: 10px;
                    color: #667eea;
                }
                .link-card p {
                    color: #666;
                    font-size: 0.95em;
                }
                .features {
                    margin-top: 50px;
                    text-align: left;
                }
                .features h2 {
                    font-size: 1.5em;
                    margin-bottom: 20px;
                    color: #333;
                }
                .feature-list {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                }
                .feature-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: #555;
                }
                .feature-item::before {
                    content: "✓";
                    color: #28a745;
                    font-weight: bold;
                    font-size: 1.2em;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>ClickPM API</h1>
                <p class="subtitle">Project Management Backend System</p>
                
                <div class="status">
                    Server Running
                </div>
                
                <div class="links">
                    <a href="/api/" class="link-card">
                        <h3>🔌 API Root</h3>
                        <p>Browse all available API endpoints</p>
                    </a>
                    <a href="/admin/" class="link-card">
                        <h3>⚙️ Admin Panel</h3>
                        <p>Manage your data and users</p>
                    </a>
                </div>
                
                <div class="features">
                    <h2> Features</h2>
                    <div class="feature-list">
                        <div class="feature-item">Workspace Management</div>
                        <div class="feature-item">Project Tracking</div>
                        <div class="feature-item">Story-based Planning</div>
                        <div class="feature-item">Task Management</div>
                        <div class="feature-item">Real-time Notifications</div>
                        <div class="feature-item">Team Collaboration</div>
                        <div class="feature-item">Mention System</div>
                        <div class="feature-item">Deadline Alerts</div>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        return HttpResponse(html)
