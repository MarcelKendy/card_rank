<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Card extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'rating',
        'image_url',
    ];

    public function categories()
    {
        return $this->belongsToMany(Category::class, 'card_categories')->withTimestamps();
    }

    public function rankings()
    {
        return $this->belongsToMany(Ranking::class, 'ranking_cards')->withPivot('placement', 'tier')->withTimestamps();
    }

    public function rankingCards()
    {
        return $this->hasMany(RankingCard::class, 'card_id');
    }
}
