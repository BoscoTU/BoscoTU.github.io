<?php
// Enable error reporting for debugging
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Set headers for JSON response
header('Content-Type: application/json');

// Database connection parameters
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "item-lending-app_v1.7";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Decode the incoming JSON request
$conditions = json_decode(file_get_contents('php://input'), true);

// Debugging: Log received conditions
error_log(print_r($conditions, true));

// Start building the SQL query
$query = "SELECT * FROM `user_history` WHERE 1=1";

// Add conditions to the query based on input
if (!empty($conditions['id'])) {
    $id = intval($conditions['id']);
    $query .= " AND `id` = $id";
}
if (isset($conditions['can_borrow'])) {
    $can_borrow = intval($conditions['can_borrow']);
    $query .= " AND `can_borrow` = $can_borrow";
}
if (!empty($conditions['date'])) {
    $date = $conditions['date'];
    $query .= " AND `date` = '$date'";
}

// Handle the most recent results option
if (!empty($conditions['recentResultsOnly'])) {
    $query = "SELECT * FROM `user_history` AS uh
              INNER JOIN (
                  SELECT `id`, MAX(`timestamp`) AS max_timestamp
                  FROM `user_history`
                  GROUP BY `id`
              ) AS recent_history
              ON uh.`id` = recent_history.`id` AND uh.`timestamp` = recent_history.`max_timestamp`
              WHERE 1=1";
    
    // Apply additional conditions after joining with most recent results
    if (isset($conditions['can_borrow'])) {
        $can_borrow = intval($conditions['can_borrow']);
        $query .= " AND uh.`can_borrow` = $can_borrow";
    }
    if (!empty($conditions['date'])) {
        $date = $conditions['date'];
        $query .= " AND uh.`date` = '$date'";
    }
}

// Debugging: Log constructed query
error_log("SQL Query: " . $query);

// Execute the query
$result = $conn->query($query);

if ($result === false) {
    // Log and return SQL error if the query fails
    error_log("SQL Error: " . $conn->error);
    echo json_encode(['error' => $conn->error]);
} else {
    // Fetch and return the result set as JSON
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $rows[] = $row;
    }
    echo json_encode($rows);
}

// Close the connection
$conn->close();
?>
