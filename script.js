const video = document.getElementById('video');
const canvas = document.getElementById('farmCanvas');
const ctx = canvas.getContext('2d');
const switchCameraIcon = document.getElementById('switchCamera');
let points = [];
let currentStream = null;
let currentCameraIndex = 0;
let streamList = [];

// Function to get available video devices
async function getVideoDevices() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter(device => device.kind === 'videoinput');
    } catch (err) {
        console.error("Error getting video devices: ", err);
        return [];
    }
}

// Function to access the camera and display the video feed
async function startCamera(deviceId) {
    try {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: deviceId } }
        });
        video.srcObject = stream;
        currentStream = stream;
    } catch (err) {
        console.error("Error accessing the camera: ", err);
    }
}

// Function to switch between cameras
async function switchCamera() {
    const devices = await getVideoDevices();
    if (devices.length > 0) {
        currentCameraIndex = (currentCameraIndex + 1) % devices.length;
        const deviceId = devices[currentCameraIndex].deviceId;
        await startCamera(deviceId);
    }
}

// Initialize the camera on page load
async function initCamera() {
    const devices = await getVideoDevices();
    if (devices.length > 0) {
        const deviceId = devices[currentCameraIndex].deviceId;
        await startCamera(deviceId);
    }
}

// Event listener for clicking on the canvas to place points
canvas.addEventListener('click', function (event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Add the point to the list
    points.push([x, y]);

    // Draw the point on the canvas
    drawPoint(x, y);

    // If more than one point, connect the points with a line
    if (points.length > 1) {
        drawLine(points[points.length - 2], points[points.length - 1]);
        // Calculate and display edge length
        const edgeLength = calculateDistance(points[points.length - 2], points[points.length - 1]);
        labelEdge(points[points.length - 2], points[points.length - 1], edgeLength);
    }
});

// Function to draw a point
function drawPoint(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = 'red';
    ctx.fill();
}

// Function to draw a line between two points
function drawLine(pt1, pt2) {
    ctx.beginPath();
    ctx.moveTo(pt1[0], pt1[1]);
    ctx.lineTo(pt2[0], pt2[1]);
    ctx.strokeStyle = 'green';
    ctx.stroke();
}

// Function to finish the boundary, calculate area, and handle the final shape
document.getElementById('finish').addEventListener('click', function () {
    if (points.length === 3) {
        // Handle the triangle case with centroid calculation
        const centroid = calculateCentroid(points);
        drawPoint(centroid[0], centroid[1]);
        labelPoint(centroid[0], centroid[1], 'A (Centroid)');
    } else if (points.length > 3) {
        // Close the shape by connecting the last point to the first
        drawLine(points[points.length - 1], points[0]);

        // Calculate and display the final edge length
        const edgeLength = calculateDistance(points[points.length - 1], points[0]);
        labelEdge(points[points.length - 1], points[0], edgeLength);

        // Draw the diagonals and predict the shape
        drawDiagonals(points);

        // Calculate and display the area of the polygon
        const area = calculatePolygonArea(points);
        displayArea(area);
    }
});

// Function to draw diagonals and compute the meeting point (center of diagonals)
function drawDiagonals(points) {
    const numPoints = points.length;

    if (numPoints >= 4) {
        const diagonals = [];
        for (let i = 0; i < numPoints; i++) {
            for (let j = i + 2; j < numPoints; j++) {
                if (Math.abs(i - j) > 1 && !(i === 0 && j === numPoints - 1)) {
                    // Draw diagonal between non-adjacent points
                    drawLine(points[i], points[j]);
                    diagonals.push([points[i], points[j]]);
                }
            }
        }

        // Calculate intersection of two main diagonals
        const A = calculateIntersection(diagonals[0][0], diagonals[0][1], diagonals[1][0], diagonals[1][1]);

        // Draw point A at the intersection of diagonals
        if (A) {
            drawPoint(A[0], A[1]);
            labelPoint(A[0], A[1], 'A');
        }

        // Calculate and label midpoints between point A and the corner points (vertices)
        for (let i = 0; i < numPoints; i++) {
            const midToA = calculateMidpoint(points[i], A);
            drawPoint(midToA[0], midToA[1]);
            labelPoint(midToA[0], midToA[1], `P${i + 1}`);
        }
    }
}

// Function to calculate the centroid of a triangle
function calculateCentroid(points) {
    const [x1, y1] = points[0];
    const [x2, y2] = points[1];
    const [x3, y3] = points[2];

    // Centroid calculation (average of the coordinates)
    const centroidX = (x1 + x2 + x3) / 3;
    const centroidY = (y1 + y2 + y3) / 3;

    return [centroidX, centroidY];
}

// Function to calculate the distance between two points
function calculateDistance(pt1, pt2) {
    return Math.sqrt(Math.pow(pt2[0] - pt1[0], 2) + Math.pow(pt1[1] - pt2[1], 2)).toFixed(2);
}

// Function to label the length of an edge between two points
function labelEdge(pt1, pt2, length) {
    const midX = (pt1[0] + pt2[0]) / 2;
    const midY = (pt1[1] + pt2[1]) / 2;
    ctx.font = "12px Arial";
    ctx.fillStyle = "blue";
    ctx.fillText(`${length} px`, midX + 5, midY - 5);
}

// Function to calculate the area of a polygon using Shoelace Theorem
function calculatePolygonArea(points) {
    let area = 0;
    const numPoints = points.length;

    for (let i = 0; i < numPoints; i++) {
        const x1 = points[i][0], y1 = points[i][1];
        const x2 = points[(i + 1) % numPoints][0], y2 = points[(i + 1) % numPoints][1];
        area += (x1 * y2 - y1 * x2);
    }
    return Math.abs(area / 2).toFixed(2);
}

// Function to display the area of the polygon
function displayArea(area) {
    ctx.font = "16px Arial";
    ctx.fillStyle = "blue";
    ctx.fillText(`Area: ${area} px²`, 10, 20);
}

// Function to calculate intersection of two lines
function calculateIntersection(pt1, pt2, pt3, pt4) {
    const x1 = pt1[0], y1 = pt1[1], x2 = pt2[0], y2 = pt2[1];
    const x3 = pt3[0], y3 = pt3[1], x4 = pt4[0], y4 = pt4[1];

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denom === 0) return null; // Lines are parallel

    const x = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom;
    const y = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom;

    return [x, y];
}

// Function to calculate the midpoint between two points
function calculateMidpoint(pt1, pt2) {
    return [(pt1[0] + pt2[0]) / 2, (pt1[1] + pt2[1]) / 2];
}

// Function to label a point on the canvas
function labelPoint(x, y, label) {
    ctx.font = "12px Arial";
    ctx.fillStyle = "blue";
    ctx.fillText(label, x + 10, y - 10);
}

// Initialize camera on page load
initCamera();

// Event listener for camera switch button
switchCameraIcon.addEventListener('click', switchCamera);
