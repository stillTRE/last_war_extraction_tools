#!/bin/bash

# Create sample directory structure for Last War Screenshot Extractor
# This script creates the expected directory structure with sample placeholder files

echo "Creating sample directory structure for Last War Screenshot Extractor..."

# Create base directories for a single week
mkdir -p screenshots/week1/{Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Weekly}

# Create output directory
mkdir -p output

echo "Created directory structure:"
echo "screenshots/"
echo "└── week1/"
echo "    ├── Monday/"
echo "    ├── Tuesday/"
echo "    ├── Wednesday/"
echo "    ├── Thursday/"
echo "    ├── Friday/"
echo "    ├── Saturday/"
echo "    └── Weekly/"
echo ""
echo "output/"

# Create sample placeholder files
echo "Creating sample placeholder files..."

# Week 1 placeholders
echo "Place your Monday screenshots here" > screenshots/week1/Monday/README.txt
echo "Place your Tuesday screenshots here" > screenshots/week1/Tuesday/README.txt
echo "Place your Wednesday screenshots here" > screenshots/week1/Wednesday/README.txt
echo "Place your Thursday screenshots here" > screenshots/week1/Thursday/README.txt
echo "Place your Friday screenshots here" > screenshots/week1/Friday/README.txt
echo "Place your Saturday screenshots here" > screenshots/week1/Saturday/README.txt
echo "Place your weekly final rankings here" > screenshots/week1/Weekly/README.txt

echo ""
echo "✅ Sample directory structure created successfully!"
echo ""
echo "Next steps:"
echo "1. Copy your Last War screenshots into the appropriate directories"
echo "2. Supported image formats: .jpg, .jpeg, .png, .gif, .bmp, .webp"
echo "3. Run 'npm run extract -- screenshots/week1 --dry-run' to check your setup"
echo "4. Run 'npm run extract -- screenshots/week1' to process your screenshots"
echo ""
echo "Example screenshot placement:"
echo "  screenshots/week1/Monday/ranking_page_1.png"
echo "  screenshots/week1/Monday/ranking_page_2.png"
echo "  screenshots/week1/Tuesday/ranking_page_1.png"
echo "  screenshots/week1/Weekly/final_rankings.png"
