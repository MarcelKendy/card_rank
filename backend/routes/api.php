<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CardController;
use App\Http\Controllers\CategoryController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// 🃏 Card Routes
Route::get('/get_cards', [CardController::class, 'getCards']); // List with filters
Route::get('/get_card/{card}', [CardController::class, 'getCard']); // Show one
Route::post('/add_card', [CardController::class, 'addCard']); // Create
Route::put('/edit_card/{card}', [CardController::class, 'editCard']); // Update
Route::delete('/delete_card/{card}', [CardController::class, 'deleteCard']); // Delete

// 🗂️ Category Routes
Route::get('/get_categories', [CategoryController::class, 'getCategories']); // List all
Route::get('/get_category/{category}', [CategoryController::class, 'getCategory']); // Show one
Route::post('/add_category', [CategoryController::class, 'addCategory']); // Create
Route::put('/edit_category/{category}', [CategoryController::class, 'editCategory']); // Update
Route::delete('/delete_category/{category}', [CategoryController::class, 'deleteCategory']); // Delete
