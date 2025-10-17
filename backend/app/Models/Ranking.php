<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ranking extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'image_url',
        'tiers',
        'filters',
    ];

    public function cards()
    {
        return $this->belongsToMany(Card::class, 'ranking_cards')->withPivot('placement', 'tier')->withTimestamps();
    }

    public function rankingCards()
    {
        return $this->hasMany(RankingCard::class, 'ranking_id');
    }
}
