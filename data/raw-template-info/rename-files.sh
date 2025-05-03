#!/bin/bash

# Rename files to match aliases

# Change "5-whys-(focused).md" to "5-whys-focused.md"
mv '5-whys-(focused).md' '5-whys-focused.md'

# Fix bullseye! (remove exclamation from filename)
mv 'bullseye!.md' 'bullseye.md'

# Fix draw-your-sprint! (remove exclamation from filename)
mv 'draw-your-sprint!.md' 'draw-your-sprint.md'

# Fix drop-add-keep-improve-retrospective.md to drop-add-keep-improve.md
mv 'drop-add-keep-improve-retrospective.md' 'drop-add-keep-improve.md'

# Fix energy-insights-retrospective.md to energy-insights.md
mv 'energy-insights-retrospective.md' 'energy-insights.md'

# Fix joy-fear-excitement! (remove exclamation from filename)
mv 'joy-fear-excitement!.md' 'joy-fear-excitement.md'

# Fix product-vision-board-(extended).md to product-vision-board-extended.md
mv 'product-vision-board-(extended).md' 'product-vision-board-extended.md'

# Fix product-vision-board-(simple).md to product-vision-board-simple.md
mv 'product-vision-board-(simple).md' 'product-vision-board-simple.md'

# Fix ROTI files to remove colon
mv 'roti:-feelings.md' 'roti-feelings.md'
mv 'roti:-fist-of-fives.md' 'roti-fist-of-fives.md'
mv 'roti:-meeting-value-1-5.md' 'roti-meeting-value-1-5.md'
mv 'roti:-phones.md' 'roti-phones.md'
mv 'roti:-star-ratings.md' 'roti-star-ratings.md'
mv 'roti:-treasure.md' 'roti-treasure.md'

# Check if any files for these aliases exist and need to be created
# easter-egg-dash
# easter-egg-dash-large
# easter-retro
# double-diamond
# impact-map
# experiment-planner
# team-canvas-simple
# six-thinking-hats
# sprint-planning
# novice-or-pro
# tigers-paper-tigers-and-elephants
# timeline-roadmap
# opportunity-solution-tree

echo "All files renamed according to the aliases." 