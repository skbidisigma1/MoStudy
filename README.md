# MoTest - FBLA Practice Exams

A web-based practice exam platform for FBLA (Future Business Leaders of America) competitive events. MoTest provides interactive, timed exams with instant feedback and comprehensive review capabilities.

## Features

- **10 Practice Exam Categories** covering various FBLA competitive events:
  - Computer Problem Solving
  - Cybersecurity
  - Introduction to Information Technology
  - Business Law
  - Entrepreneurship
  - Accounting
  - Banking & Financial Systems
  - Business Ethics
  - Data Science & AI
  - International Business

- **Interactive Exam Interface**
  - Timed exams with countdown timer
  - Multiple-choice questions with immediate feedback
  - Question navigation and progress tracking
  - Flag questions for review
  - Responsive design for desktop and mobile

- **Dark Mode Support**
  - Automatic theme detection
  - Manual theme toggle
  - Optimized color scheme for comfortable studying

- **Comprehensive Review Tools**
  - Answer review screen with correct/incorrect indicators
  - Detailed score breakdown
  - Performance analytics
  - Flagged question tracking

- **Custom Test Uploads**
  - Import custom exam questions via JSON
  - Flexible format for educational content creators

## Getting Started

### Prerequisites
No installation required! MoTest runs entirely in the browser with no backend dependencies.

### Running Locally

1. Clone the repository:
```bash
git clone <repository-url>
cd MoLearn-Beta
```

2. Open in a web server (required for proper file loading):
```bash
# Using Python 3
python -m http.server 8000

# Or using Node.js http-server
npx http-server
```

3. Open your browser and navigate to `http://localhost:8000`

## Project Structure

```
├── index.html           # Main application page
├── app.js              # Core application logic
├── styles.css          # Theme and styling
├── data/               # Test question data
│   ├── *.json          # Test question files
│   └── example-tests/  # Sample questions for reference
└── README.md           # This file
```

## JSON Test Format

Custom tests should follow this JSON structure:

```json
{
  "title": "Test Name",
  "description": "Test Description",
  "timeLimit": 3000,
  "questions": [
    {
      "id": 1,
      "question": "Question text here?",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "correct": 0,
      "explanation": "Why this answer is correct..."
    }
  ]
}
```

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Features in Detail

### Timed Exams
Each exam has a configurable time limit. The timer displays prominently and provides warnings as time runs low.

### Answer Tracking
All answers are tracked throughout the exam session, allowing students to review their responses before submitting.

### Review Mode
After completing an exam, students can review all questions, see which they answered correctly, and read explanations.

### Flagging
Important or difficult questions can be flagged for quick review before submission.

## Customization

### Adding New Tests
1. Create a JSON file with your test questions following the format above
2. Place it in the `data/` directory
3. Add an entry to the catalog in [app.js](app.js) with the test details

### Styling
The application uses Tailwind CSS and custom CSS variables. Edit [styles.css](styles.css) to customize colors and fonts.

### Theme Colors
Modify the CSS variables in `styles.css` to change the overall appearance:
- `--color-primary`: Primary brand color
- `--color-bg`: Background color
- `--color-text`: Text color

## Development

The application is built with vanilla JavaScript, requiring no build step or dependencies. Simply edit the source files and refresh your browser.

### Key Files
- [app.js](app.js): Main application with all quiz logic
- [index.html](index.html): HTML structure
- [styles.css](styles.css): Styling and theme variables

## Contributing

Contributions are welcome! Feel free to:
- Add new test questions
- Improve the UI/UX
- Fix bugs
- Optimize performance

## License

[Add appropriate license]

## Support

For issues, questions, or suggestions, please open an issue on the repository.

---

Built with ❤️ for FBLA students and educators
