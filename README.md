# Visual Eye Tracking Exercises

A highly customizable, web-based single-page application designed for visual tracking exercises. This tool helps improve eye flexibility, concentration, and smooth pursuit movements by having the user follow a moving target across the screen along various mathematical paths.

## Features

*   **Zero Dependencies**: Built with pure HTML5 Canvas, CSS, and Vanilla JavaScript.
*   **Persistent Settings**: Your preferences (including custom themes and specific pattern speeds) are automatically saved to your browser's local storage and restored on your next visit.
*   **Smooth Transitions**: Switching between tracking patterns smoothly interpolates the ball's position, completely avoiding jarring teleportation effects.
*   **Session Timer**: A built-in timer automatically tracks your active exercise duration, pausing when you pause the exercise.

## Available Patterns

You can choose from a variety of movement patterns tailored for different visual tracking exercises:

*   **Horizontal Side-to-Side**: Basic left-to-right tracking.
*   **Vertical Up-and-Down**: Basic top-to-bottom tracking.
*   **Reading (Zig-Zag)**: Simulates reading a book, sweeping left-to-right and snapping back down diagonally.
*   **Corner Sequence**: Traces the extreme corners of the screen (Top-Left -> Bottom-Left -> Bottom-Right -> Top-Right).
*   **Diagonal Cross (Hourglass)**: Crosses the screen diagonally, connected by straight edges.
*   **Full Cross Tour**: A complex 12-segment path covering all corners and internal diagonals continuously.
*   **Circular Rotation**: Smooth circular tracking around the center point.
*   **Figure 8 (Infinity)**: Traces a fluid infinity symbol.
*   **Square Boundary**: Follows the outer rectangular edge of the screen.
*   **Smooth Pursuit (Random)**: A smooth, pseudo-random wandering path that cannot be predicted.

## Cycle Mode (Auto-Rotate)

Instead of manually selecting a single pattern, you can choose **Cycle Selected (Auto-Rotate)** to have the application cycle through a playlist of exercises automatically.

*   **Customizable Playlist**: Use the checkboxes to select exactly which patterns should be included in the cycle.
*   **Duration**: Set how long each pattern runs before transitioning.
*   **Cycle Controls**: A dedicated control bar appears at the bottom of the screen, allowing you to manually skip forward, jump backward, or pause the rotation cycle.

## Customizable Settings

The application offers extensive granular control to tailor the session to your needs:

*   **Speed**: Adjust the movement speed of the target. *Note: The application remembers your preferred speed for each individual pattern!*
*   **Ball Size**: Increase or decrease the radius of the tracking target.
*   **Themes**: Choose from Dark, Light, High Contrast, or Cyberpunk Neon themes.
*   **Custom Colors**: Select the "Custom Colors" theme to define your own exact Background and Accent hex colors using native color pickers.
*   **Target Path Visibility**: A slider that lets you reveal the mathematical line the target is following. You can adjust it from completely invisible (0%) to fully visible (100%).
*   **Number of Balls**: Add trailing targets behind the primary ball to create a chain or snake effect.
*   **Trail Effect**: Adds a fading motion-blur trail behind the moving targets by leaving a percentage of previous frames on the canvas.

## Keyboard Controls

*   `Spacebar`: Pause or Resume the exercise.
*   `Escape`: Toggle the visibility of the settings panel.

## Installation & Usage

Since this is a standalone web application, no build tools or package managers are required. 
Simply open `index.html` in any modern web browser to start using the tool, or host the directory on any basic web server.

## Credits & Acknowledgements
- **Conceptualization & Direction:** Designed and structured by Dane.
- **Architectural Implementation:** Programmed interactively in collaboration with **Antigravity**, an agentic AI coding assistant built by Google DeepMind.
- **Eye Tracking Model:** Powered mechanically by [WebGazer.js](https://webgazer.cs.brown.edu/), an open-source library built by the Human-Computer Interaction Lab at Brown University.

## License

This project is licensed under the permissive **MIT License** — see the [LICENSE](LICENSE) file for details. 

**Third-Party Dependencies:**
This project utilizes [WebGazer.js](https://webgazer.cs.brown.edu/) for webcam-based eye tracking. WebGazer is dynamically linked and is officially dual-licensed under **GPLv3** and **LGPLv3** (for companies with a valuation under $1,000,000). Commercial users deploying this software should ensure their usage complies with WebGazer's GNU stipulations.
