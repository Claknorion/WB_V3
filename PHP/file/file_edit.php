<?php
session_start();
require_once '../db.php';
$pdo = connectDB();

// Check login & role
if (!isset($_SESSION['user']) || !in_array($_SESSION['user']['Role'], ['admin', 'employee'])) {
    header("Location: ../auth/login.php");
    exit();
}

// Setup
$uid = $_GET['uid'] ?? null;
if (!$uid) {
    echo "No UID specified.";
    exit();
}

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $zoeknaam = $_POST['Zoeknaam'] ?? '';
    $email = $_POST['Email'] ?? '';
    $datum_start = $_POST['Datum_start'] ?? null;
    $bestemming = $_POST['Bestemming'] ?? '';
    $status = $_POST['Status'] ?? '';

    $fieldsToUpdate = [
        'Zoeknaam = :zoeknaam',
        'Email = :email',
        'Bestemming = :bestemming',
        'Status = :status',
        'Datum_lastchange = NOW()'
    ];

    $params = [
        ':zoeknaam' => $zoeknaam,
        ':email' => $email,
        ':bestemming' => $bestemming,
        ':status' => $status,
        ':uid' => $uid
    ];

    if (!empty($datum_start)) {
        $fieldsToUpdate[] = 'Datum_start = :datum_start';
        $params[':datum_start'] = $datum_start;
    }

    $sql = "UPDATE File_info SET " . implode(', ', $fieldsToUpdate) . " WHERE UID = :uid";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    header("Location: file_list.php");
    exit();
}


// Fetch current data
$stmt = $pdo->prepare("SELECT UID, Zoeknaam, Email, Datum_start, Bestemming, Status FROM File_info WHERE UID = :uid");
$stmt->execute(['uid' => $uid]);
$file = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$file) {
    echo "File not found.";
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>Edit File <?= htmlspecialchars($file['UID']) ?></title>
    <link rel="stylesheet" href="../CSS/styles.css" />
</head>
<body>
    <h1>Edit File: <?= htmlspecialchars($file['UID']) ?></h1>
    <form method="POST">
        <label>Zoeknaam:<br />
            <input type="text" name="Zoeknaam" value="<?= htmlspecialchars($file['Zoeknaam']) ?>" required />
        </label><br /><br />

        <label>Email:<br />
            <input type="email" name="Email" value="<?= htmlspecialchars($file['Email']) ?>" required />
        </label><br /><br />

        <label>Datum start:<br />
            <input type="date" name="Datum_start" value="<?= htmlspecialchars($file['Datum_start']) ?>" />
        </label><br /><br />

        <label>Bestemming:<br />
            <select name="Bestemming">
                <option value="Australië" <?= $file['Bestemming'] === 'AU' ? 'selected' : '' ?>>Australië</option>
                <option value="Nieuw-Zeeland" <?= $file['Bestemming'] === 'NZ' ? 'selected' : '' ?>>Nieuw-Zeeland</option>
                <option value="Beide landen" <?= $file['Bestemming'] === 'AUNZ' ? 'selected' : '' ?>>Beide landen</option>
            </select>
        </label><br /><br />

        <label>Status:<br />
            <input type="text" name="Status" value="<?= htmlspecialchars($file['Status']) ?>" />
        </label><br /><br />

        <button type="submit">Save</button>
        <a href="file_list.php">Cancel</a>
    </form>
</body>
</html>
