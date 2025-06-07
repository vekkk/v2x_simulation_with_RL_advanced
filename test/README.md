# Vehicle Network Simulation - Test Version

This directory contains a simplified, single-file version of the simulation used for testing and development. It serves as an intermediate step between the reference implementation and the modular version.

## Purpose
- Quick testing of new features
- Debugging visualization issues
- Verifying network parameters
- Testing UI changes

## Project Structure
```
test/
├── README.md
└── index.html    # Current working test version
```

## Usage
1. Start a local server in the project root:
   ```bash
   python -m http.server 8000
   ```
2. Open in browser:
   ```
   http://localhost:8000/test/index.html
   ```

## Development Workflow
1. Make changes to `index.html`
2. Test functionality
3. If successful, incorporate changes into:
   - Reference version (`reference/working_simulation.html`)
   - Modular version (in `js/` directory)

## Notes
- This is a development/testing environment
- Changes here should be verified before moving to other versions
- Keep this version in sync with the reference version
- Use this for quick iterations and testing 