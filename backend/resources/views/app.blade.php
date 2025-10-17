{{-- backend/resources/views/app.blade.php --}}
<!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Card Rankings</title>

    {{-- This reads public/build/manifest.json in production --}}
    {{-- Make sure the string matches your entry file key in the manifest --}}
    @vite('index.html')
</head>

<body>
    <div id="root"></div>
</body>

</html>