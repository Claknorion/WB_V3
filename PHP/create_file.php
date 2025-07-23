<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

session_start();
require_once 'randomUID.php';
require_once 'db.php';
$pdo = connectDB();

if (!isset($_SESSION['user']) || ($_SESSION['user']['Role'] !== 'employee' && $_SESSION['user']['Role'] !== 'admin')) {
    header('Location: /HTML/dashboard.html');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $uid = generateUID();
    $phone = $_POST['phone'] ?? '';
    $email = $_POST['email'] ?? '';
    $pax = isset($_POST['pax']) ? intval($_POST['pax']) : 0;
    $bestemming = $_POST['bestemming'] ?? '';
    $aanhef = $_POST['aanhef'] ?? '';
    $voornaam = $_POST['voornaam'] ?? '';
    $roepnaam = $_POST['roepnaam'] ?? '';
    $tuss1 = $_POST['tuss1'] ?? '';
    $tuss2 = $_POST['tuss2'] ?? '';
    $achternaam = $_POST['achternaam'] ?? '';
    $zoeknaam = $achternaam;
    if ($tuss1) $zoeknaam .= ', ' . $tuss1;
    if ($tuss2) $zoeknaam .= ' ' . $tuss2;
    $status = "Offerte";
    $hidden = 0;
    $datum_nextreminder = date('Y-m-d', strtotime('+14 days'));
    $datum_lastchange = date('Y-m-d H:i:s');
    $medewerker = $_SESSION['user']['Showname'];

    $pdo = connectDB();
    try {
        $pdo->beginTransaction();

        // Insert into File_info
        $stmt1 = $pdo->prepare("INSERT INTO File_info 
            (UID, Phone, Email, PAX, Bestemming, Zoeknaam, Status, Hidden, Datum_nextreminder, Datum_lastchange, Medewerker)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt1->execute([$uid, $phone, $email, $pax, $bestemming, $zoeknaam, $status, $hidden, $datum_nextreminder, $datum_lastchange, $medewerker]);

        // Insert into Persoon_info
        $stmt2 = $pdo->prepare("INSERT INTO Persoon_info 
            (UID, Aanhef, Voornaam, Roepnaam, Tuss1, Tuss2, Achternaam)
            VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt2->execute([$uid, $aanhef, $voornaam, $roepnaam, $tuss1, $tuss2, $achternaam]);

        $pdo->commit();
        echo "New file created successfully with UID: $uid";
    } catch (Exception $e) {
        $pdo->rollBack();
        echo "Error: " . $e->getMessage();
    }
    exit;
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Create New File</title>
    <style>
        input:valid + .checkmark { display: inline; color: green; }
        .checkmark { display: none; margin-left: 5px; }
        button { margin: 3px; }
    </style>
</head>
<body>
    <h2>Create New File</h2>
    <form method="POST" action="create_file.php">
        <h3>File Info</h3>
        <label>Phone: <input type="text" name="phone" value="+31 6 " pattern=".{10,}" required>
        <span class="checkmark">✔</span></label><br>

        <label>Email: <input type="email" name="email" required>
        <span class="checkmark">✔</span></label><br>

        <label>PAX: <input type="number" name="pax" required></label><br>

        <label>Bestemming:
            <input type="hidden" name="bestemming" id="bestemming" required>
            <button type="button" onclick="setBestemming('Australië')">Australië</button>
            <button type="button" onclick="setBestemming('Nieuw-Zeeland')">Nieuw-Zeeland</button>
            <button type="button" onclick="setBestemming('Beide landen')">Beide landen</button>
        </label><br>

        <h3>Persoon Info</h3>
        <label>Aanhef:
            <input type="radio" name="aanhef" value="Mr" required> Mr
            <input type="radio" name="aanhef" value="Mrs"> Mrs
            <input type="radio" name="aanhef" value="Miss"> Miss
            <input type="radio" name="aanhef" value="Mstr"> Mstr
        </label><br>

        <label>Voornaam: <input type="text" name="voornaam" id="voornaam" oninput="copyVoornaam()" required></label><br>
        <label>Roepnaam: <input type="text" name="roepnaam" id="roepnaam" required></label><br>
        <label>Tussenvoegsel 1: <input type="text" name="tuss1"></label><br>
        <label>Tussenvoegsel 2: <input type="text" name="tuss2"></label><br>
        <label>Achternaam: <input type="text" name="achternaam" required></label><br><br>

        <button type="submit">Create File</button>
    </form>

    <script>
        function copyVoornaam() {
            const voornaam = document.getElementById('voornaam').value;
            document.getElementById('roepnaam').value = voornaam;
        }

        function setBestemming(value) {
            let abbr = '';
            switch (value) {
                case 'Australië': abbr = 'AU'; break;
                case 'Nieuw-Zeeland': abbr = 'NZ'; break;
                case 'Beide landen': abbr = 'AUNZ'; break;
            }
            document.getElementById('bestemming').value = abbr;
        }
    </script>
</body>
</html>
