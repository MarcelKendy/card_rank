<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Card;
use Illuminate\Http\Request;

class CardController extends Controller
{
    public function getCard($card)
    {
        $card = Card::findOrFail($card);
        return response()->json($card);
    }

    public function getCards(Request $request)
    {        
        $search = $request->input('search');
        $category_ids = $request->input('category_ids', []);
        $match_any = filter_var($request->input('match_any'), FILTER_VALIDATE_BOOLEAN);

        $query = Card::query();
        if ($match_any) {
            $query->where(function ($q) use ($search, $category_ids) {
                if ($search) {
                    $q->orWhere('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                }
                if (!empty($category_ids)) {
                    $q->orWhereHas('categories', function ($catQuery) use ($category_ids) {
                        $catQuery->whereIn('categories.id', $category_ids);
                    });
                }
            });
        } else {
            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }
            if (!empty($category_ids)) {
                foreach ($category_ids as $categoryId) {
                    $query->whereHas('categories', function ($catQuery) use ($categoryId) {
                        $catQuery->where('categories.id', $categoryId);
                    });
                }
            }
        }

        return response()->json($query->get());
    }

    public function addCard(Request $request)
    {
        $card = Card::create($request->all());
        return response()->json($card);
    }

    public function editCard(Request $request, Card $card)
    {
        $card->update($request->all());
        return response()->json($card);
    }

    public function deleteCard(Card $card)
    {
        $card->categories()->detach();
        $card->delete();    
        return response()->json($card);
    }    

}
