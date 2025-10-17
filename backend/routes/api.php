<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CardController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\RankingController;

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

// Card Routes
Route::get('/get_cards', [CardController::class, 'getCards']); // List with filters
Route::get('/get_card/{card}', [CardController::class, 'getCard']); // Show one
Route::post('/add_card', [CardController::class, 'addCard']); // Create
Route::put('/edit_card/{card}', [CardController::class, 'editCard']); // Update
Route::delete('/delete_card/{card}', [CardController::class, 'deleteCard']); // Delete
Route::post('/sync_card_categories/{card}', [CardController::class, 'syncCardCategories']); // Sync Card Categories
Route::post('/delete_card_category/{card}', [CardController::class, 'deleteCardCategories']); // Sync Card Categories

// Category Routes
Route::get('/get_categories', [CategoryController::class, 'getCategories']); // List all
Route::get('/get_category/{category}', [CategoryController::class, 'getCategory']); // Show one
Route::post('/add_category', [CategoryController::class, 'addCategory']); // Create
Route::put('/edit_category/{category}', [CategoryController::class, 'editCategory']); // Update
Route::delete('/delete_category/{category}', [CategoryController::class, 'deleteCategory']); // Delete

// Ranking Routes
Route::get('/get_ranking/{ranking}', [RankingController::class, 'getRanking']);
Route::get('/get_rankings', [RankingController::class, 'getRankings']);
Route::post('/add_ranking', [RankingController::class, 'addRanking']);
Route::put('/edit_ranking/{ranking}', [RankingController::class, 'editRanking']);
Route::delete('/delete_ranking/{ranking}', [RankingController::class, 'deleteRanking']);
Route::post('/sync_ranking_cards/{ranking}', [RankingController::class, 'syncRankingCards']);

// Home Routes
Route::get('/get_best_ranked_cards', [HomeController::class, 'getBestRankedCards']);