<?php
// get_tour_timeslots.php - Fetch available timeslots for a tour
require_once '../db.php';

// Set content type to JSON
header('Content-Type: application/json');

// Check if tour_id parameter is provided
if (!isset($_GET['tour_id'])) {
    echo json_encode(['error' => 'Tour ID required']);
    exit;
}

$tour_id = $_GET['tour_id'];

try {
    // Get database connection
    $conn = connectDB();
    
    // Query the database for tour timeslots
    $sql = "SELECT 
                pts.ID as id,
                pts.Slot_Name as slotName,
                TIME_FORMAT(pts.Start_Time, '%H:%i') as startTime,
                TIME_FORMAT(pts.End_Time, '%H:%i') as endTime,
                pts.Is_Flexible_Start as isFlexibleStart,
                pts.Is_Flexible_End as isFlexibleEnd,
                pts.Min_Duration_Hours as minDurationHours,
                pts.Max_Duration_Hours as maxDurationHours,
                pts.Price_Modifier as priceModifier,
                pts.Available_Days as availableDays,
                pts.Is_Multi_Day as isMultiDay,
                pts.Duration_Days as durationDays,
                CASE 
                    WHEN pts.Is_Multi_Day = 1 THEN CONCAT(pts.Duration_Days, ' days')
                    WHEN pts.Is_Flexible_Start = 1 OR pts.Is_Flexible_End = 1 THEN CONCAT(pts.Min_Duration_Hours, '-', pts.Max_Duration_Hours, ' hours (customizable)')
                    ELSE CONCAT(TIMESTAMPDIFF(HOUR, CONCAT('2000-01-01 ', pts.Start_Time), CONCAT('2000-01-01 ', pts.End_Time)), ' hours')
                END as duration
            FROM Product_tours_timeslots pts 
            INNER JOIN Product_tours_product ptp ON pts.Tour_ID = ptp.tourID
            WHERE pts.Tour_ID = ? AND pts.Is_Active = 1 
            ORDER BY pts.Display_Order ASC, pts.Start_Time ASC";

    $stmt = $conn->prepare($sql);
    $stmt->execute([$tour_id]);
    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $timeslots = [];
    foreach ($result as $row) {
        $timeslots[] = [
            'id' => (int)$row['id'],
            'slotName' => $row['slotName'],
            'startTime' => $row['startTime'],
            'endTime' => $row['endTime'],
            'isFlexibleStart' => (bool)$row['isFlexibleStart'],
            'isFlexibleEnd' => (bool)$row['isFlexibleEnd'],
            'minDurationHours' => $row['minDurationHours'] ? (float)$row['minDurationHours'] : null,
            'maxDurationHours' => $row['maxDurationHours'] ? (float)$row['maxDurationHours'] : null,
            'priceModifier' => (float)$row['priceModifier'],
            'availableDays' => $row['availableDays'],
            'isMultiDay' => (bool)$row['isMultiDay'],
            'durationDays' => (int)$row['durationDays'],
            'duration' => $row['duration']
        ];
    }

    echo json_encode([
        'success' => true,
        'timeslots' => $timeslots,
        'tour_id' => $tour_id,
        'count' => count($timeslots)
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'error' => 'Database error: ' . $e->getMessage()
    ]);
}
?>
