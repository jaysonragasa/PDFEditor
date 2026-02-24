# PDF Editor

A powerful, browser-based PDF editing application built with React and Tailwind CSS. This tool allows you to view, annotate, and modify PDF documents directly in your browser without needing to upload them to a server.

## Features

- **View PDFs**: Seamlessly open and navigate through multi-page PDF documents.
- **Pan and Zoom**: Easily navigate around the document with intuitive pan and zoom controls (including pinch-to-zoom on touch devices).
- **Text Annotations**: Add, edit, resize, and position text anywhere on the document.
- **Image Insertion**: Upload and place images onto your PDF.
- **Signature Pad**: Draw your signature using a built-in, touch-friendly signature pad with stroke stabilization, and place it on the document.
- **Freehand Drawing**: Draw directly on the PDF with a customizable pen tool (adjustable color and brush size). Features Exponential Moving Average (EMA) stabilization for smooth curves.
- **Eraser Tool**: Precisely erase your freehand drawings without affecting the underlying PDF content.
- **Object Manipulation**: Select, move, resize, copy, paste, and delete text and image/signature objects. Supports both keyboard shortcuts and mobile-friendly action menus.
- **Dark/Light Theme**: Toggle between dark and light modes for comfortable viewing in any environment.
- **Password Protection Support**: Open and edit password-protected PDF files.
- **Export**: Save your annotated document as a new PDF file, preserving all your additions.

## Technologies Used

- **React**: Frontend framework for building the user interface.
- **Tailwind CSS**: Utility-first CSS framework for styling and responsive design.
- **pdfjs-dist**: Mozilla's PDF.js library for rendering PDF pages to HTML5 Canvas.
- **pdf-lib**: Library for creating and modifying PDF documents (used for exporting the final PDF).
- **react-rnd**: Resizable and draggable component for React, used for text and image overlays.
- **react-signature-canvas**: Canvas-based signature pad component.
- **lucide-react**: Beautiful and consistent icon set.

## Getting Started

### Prerequisites

Ensure you have Node.js and npm installed on your machine.

### Installation

1. Clone the repository or download the source code.
2. Navigate to the project directory in your terminal.
3. Install the dependencies:

```bash
npm install
```

### Running the Development Server

Start the development server to run the application locally:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Building for Production

To create a production-ready build:

```bash
npm run build
```

The compiled assets will be available in the `dist` directory.

## Usage

1. **Upload a PDF**: Click the upload area or drag and drop a PDF file to get started.
2. **Navigate**: Use the pagination controls or scroll to move between pages. Use the Pan tool (Hand icon) to move around the page.
3. **Annotate**:
   - Select the **Text tool** (T icon) and click anywhere to add text. Double-click text to edit it.
   - Select the **Image tool** (Image icon) to upload and insert an image.
   - Select the **Signature tool** (Pen icon) to draw and insert your signature.
   - Select the **Pen tool** (Marker icon) to draw freehand. Adjust color and size using the toolbar.
   - Select the **Eraser tool** to remove freehand strokes.
4. **Manipulate Objects**: Click on text or images to select them. You can drag to move, use the handles to resize, or use the floating menu to copy/delete.
5. **Export**: Click the **Export** button to generate and download your edited PDF.

## License

This project is open-source and available under the MIT License.
