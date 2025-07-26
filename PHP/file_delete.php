<?php
session_start();
require_once '../PHP/db.php';
$pdo = connectDB();

// Check login and role
if (!isset($_SESSION['user'])) {
    header("Location: login.php");
    exit();
}
$userRole = $_SESSION['user']['Role'] ?? 'customer';
if (!in_array($userRole, ['admin'])) {
    echo "Access denied.";
    exit();
}

// Get UID
$uid = $_GET['uid'] ?? null;
if (!$uid) {
    echo "No UID specified.";
    exit();
}

// Confirm deletion
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $deleteHoofdboeker = isset($_POST['delete_hoofdboeker']);
    $deleteMedereiziger = isset($_POST['delete_medereiziger']);

    try {
        $pdo->beginTransaction();

        // Get all persons linked to this trip and their roles
        $stmt = $pdo->prepare("SELECT PersoonID, Rol FROM Persoon_reizen WHERE UID = ?");
        $stmt->execute([$uid]);
        $personen = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Delete trip
        $stmt = $pdo->prepare("DELETE FROM File_info WHERE UID = ?");
        $stmt->execute([$uid]);

        // Delete link in Persoon_reizen
        $stmt = $pdo->prepare("DELETE FROM Persoon_reizen WHERE UID = ?");
        $stmt->execute([$uid]);

        // Optional deletion of person(s)
        foreach ($personen as $persoon) {
            $persoonID = $persoon['PersoonID'];
            $rol = $persoon['Rol'];

            if (
                ($rol === 'hoofdboeker' && $deleteHoofdboeker) ||
                ($rol === 'medereiziger' && $deleteMedereiziger)
            ) {
                // Only delete person if they are NOT linked to any other trips
                $check = $pdo->prepare("SELECT COUNT(*) FROM Persoon_reizen WHERE PersoonID = ?");
                $check->execute([$persoonID]);
                if ($check->fetchColumn() == 0) {
                    $delete = $pdo->prepare("DELETE FROM Persoon_info WHERE ID = ?");
                    $delete->execute([$persoonID]);
                }
            }
        }

        $pdo->commit();
        header("Location: file_list.php");
        exit();
    } catch (Exception $e) {
        $pdo->rollBack();
        echo "Error: " . $e->getMessage();
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Delete File</title>
    <link rel="stylesheet" href="../CSS/styles.css">
</head>
<body>
    <h2>Are you sure you want to delete this file?</h2>
    <form method="POST" action="file_delete.php?uid=<?= urlencode($uid) ?>">
        <label><input type="checkbox" name="delete_hoofdboeker" checked> Delete hoofdboeker</label><br>
        <label><input type="checkbox" name="delete_medereiziger"> Delete medereiziger(s)</label><br><br>
        <button type="submit" style="color: red;">Yes, Delete</button>
        <a href="file_list.php">Cancel</a>
    </form>
</body>
</html>

